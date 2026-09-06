import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { fetchReactionSummary, toggleReaction } from "@/lib/reactions";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || user.role === "pending" || user.isDeactivated)
    return NextResponse.json(
      { message: "승인된 활성 회원만 반응을 남길 수 있습니다." },
      { status: 403 },
    );
  let emoji: unknown;
  try {
    ({ emoji } = await req.json());
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }
  if (typeof emoji !== "string" || !emoji.trim() || emoji.length > 32)
    return NextResponse.json(
      { message: "이모지를 선택해주세요." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  const { id } = await ctx.params;
  try {
    await toggleReaction({
      supabase,
      table: "highlight_reactions",
      contentColumn: "highlight_id",
      contentId: id,
      userId: user.id,
      emoji,
    });
    return NextResponse.json(
      await fetchReactionSummary(
        supabase,
        "highlight_reactions",
        "highlight_id",
        id,
        user.id,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "반응 저장 실패" },
      { status: 400 },
    );
  }
}
