import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseAdminClient } from "@supabase/admin";

export async function getOrCreateReviewSpellcheckDraft(userId: string) {
  const db = createSupabaseAdminClient(
    "맞춤법 검사 초안 서버 설정이 필요합니다.",
  );
  const existing = await db
    .from("review_spellcheck_drafts")
    .select("review_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.review_id;

  const reviewId = randomUUID();
  const created = await db
    .from("review_spellcheck_drafts")
    .insert({ review_id: reviewId, user_id: userId });
  if (!created.error) return reviewId;

  // Concurrent page loads share the row that won the unique-user race.
  if (created.error.code === "23505") {
    const winner = await db
      .from("review_spellcheck_drafts")
      .select("review_id")
      .eq("user_id", userId)
      .single();
    if (!winner.error) return winner.data.review_id;
  }
  throw created.error;
}
