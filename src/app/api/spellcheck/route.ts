import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import {
  toSpellcheckIssues,
  type SpellcheckIssue,
  type SpellcheckSegment,
} from "@/lib/spellcheck";

const MAX_SEGMENTS = 80;
const MAX_SEGMENT_CHARS = 5_000;
const MAX_TOTAL_CHARS = 30_000;
const BAREUN_URL =
  "https://api.bareun.ai/bareun.RevisionService/CorrectError";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseSegments(value: unknown): SpellcheckSegment[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SEGMENTS) {
    return null;
  }

  let totalChars = 0;
  const seenIds = new Set<string>();
  const segments: SpellcheckSegment[] = [];

  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }
    const { id, text } = item as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(id) ||
      seenIds.has(id) ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > MAX_SEGMENT_CHARS
    ) {
      return null;
    }
    seenIds.add(id);
    totalChars += text.length;
    if (totalChars > MAX_TOTAL_CHARS) return null;
    segments.push({ id, text });
  }

  return segments;
}

function isSpellcheckLimitExempt(userId: string) {
  // Local development is intentionally unrestricted for the active tester.
  if (process.env.NODE_ENV === "development") return true;

  return (process.env.SPELLCHECK_UNLIMITED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

async function checkSegment(
  segment: SpellcheckSegment,
  apiKey: string,
): Promise<SpellcheckIssue[]> {
  let response: Response;
  try {
    response = await fetch(BAREUN_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document: { content: segment.text, language: "ko-KR" },
        // JavaScript string offsets and ProseMirror text offsets are UTF-16.
        encoding_type: "UTF16",
        config: { enable_sentence_check: true },
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new Error("provider_unavailable");
  }

  if (!response.ok) {
    console.error("Spellcheck provider returned an error", {
      status: response.status,
    });
    throw new Error("provider_unavailable");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("provider_invalid_response");
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("provider_invalid_response");
  }

  return toSpellcheckIssues(segment.id, segment.text, body);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (
    !user ||
    user.isDeactivated ||
    (user.role !== "member" && user.role !== "admin")
  ) {
    return jsonError("맞춤법 검사는 승인된 회원만 사용할 수 있습니다.", 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("검사할 본문 형식이 올바르지 않습니다.", 400);
  }

  const payloadRecord =
    payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const reviewId = payloadRecord?.reviewId;
  if (typeof reviewId !== "string" || !UUID_PATTERN.test(reviewId)) {
    return jsonError("독후감 식별 정보가 올바르지 않습니다.", 400);
  }
  const segments = parseSegments(payloadRecord?.segments);
  if (!segments) {
    return jsonError("검사할 본문이 비어 있거나 너무 깁니다.", 400);
  }

  const apiKey = process.env.BAREUN_API_KEY;
  if (!apiKey) {
    return jsonError(
      "맞춤법 검사 서비스를 아직 설정하지 않았습니다. 관리자에게 문의해주세요.",
      503,
    );
  }

  const isExempt = isSpellcheckLimitExempt(user.id);
  const supabase = await createSupabaseServerClient();
  let reservationCreated = false;

  if (!isExempt) {
    // Existing reviews can only be checked by their author. A missing row is a
    // new draft, whose UUID is submitted with the subsequent review creation.
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("author_id")
      .eq("id", reviewId)
      .maybeSingle();
    if (reviewError) {
      return jsonError("맞춤법 검사 횟수를 확인하지 못했습니다.", 500);
    }
    if (review?.author_id && review.author_id !== user.id) {
      return jsonError("다른 회원의 독후감은 검사할 수 없습니다.", 403);
    }

    const { error: reservationError } = await supabase
      .from("review_spellcheck_uses")
      .insert({ review_id: reviewId, user_id: user.id });
    if (reservationError?.code === "23505") {
      return jsonError("이 독후감은 맞춤법 검사를 이미 사용했습니다.", 429);
    }
    if (reservationError) {
      return jsonError("맞춤법 검사 횟수를 기록하지 못했습니다.", 500);
    }
    reservationCreated = true;
  }

  try {
    const results = await Promise.all(
      segments.map((segment) => checkSegment(segment, apiKey)),
    );
    return NextResponse.json({ issues: results.flat() });
  } catch (error) {
    if (reservationCreated) {
      await supabase
        .from("review_spellcheck_uses")
        .delete()
        .eq("review_id", reviewId)
        .eq("user_id", user.id);
    }
    const message =
      error instanceof Error && error.message === "provider_invalid_response"
        ? "맞춤법 검사 결과를 읽지 못했습니다. 다시 시도해주세요."
        : "맞춤법 검사 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.";
    return jsonError(message, 502);
  }
}
