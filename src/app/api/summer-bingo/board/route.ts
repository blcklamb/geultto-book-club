import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import type { Json } from "@supabase/types";
import { getSessionUser } from "@/lib/auth";
import { normalizeBoard } from "@/features/summer-bingo/lib/storage";

const MAX_BOARD_PAYLOAD_BYTES = 12 * 1024 * 1024;

export async function GET() {
  const authError = await getBingoAuthError();
  if (authError) {
    return authError;
  }

  const sessionUser = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("summer_bingo_boards")
    .select("board, updated_at")
    .eq("user_id", sessionUser!.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load summer bingo board", {
      userId: sessionUser!.id,
      error,
    });
    return NextResponse.json(
      { message: "팔레트를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    board: data?.board ? normalizeBoard(data.board) : null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const authError = await getBingoAuthError();
  if (authError) {
    return authError;
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { message: "요청 본문 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const board = normalizeBoard(
    isRecord(payload) ? payload.board : undefined,
  );
  if (!board) {
    return NextResponse.json(
      { message: "팔레트 데이터 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const serializedBoard = JSON.stringify(board);
  if (new Blob([serializedBoard]).size > MAX_BOARD_PAYLOAD_BYTES) {
    return NextResponse.json(
      { message: "팔레트 사진 용량이 너무 큽니다." },
      { status: 413 },
    );
  }

  const sessionUser = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("summer_bingo_boards").upsert(
    {
      user_id: sessionUser!.id,
      board: board as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Failed to save summer bingo board", {
      userId: sessionUser!.id,
      error,
    });
    return NextResponse.json(
      { message: "팔레트를 서버에 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function getBingoAuthError() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  if (sessionUser.isDeactivated || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "승인된 회원만 팔레트를 서버에 저장할 수 있습니다." },
      { status: 403 },
    );
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
