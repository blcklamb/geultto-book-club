import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { summarizeReactions } from "@/lib/reactions";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const commentId = (await ctx.params).id;
  const { emoji } = (await req.json()) as { emoji: string };

  if (!emoji) {
    return NextResponse.json(
      { message: "이모지를 선택해주세요." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Toggle: remove if already reacted, add if not
  const { data: existing } = await supabase
    .from("highlight_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", sessionUser.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("highlight_comment_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json(
        { message: "반응 취소 실패", error: error.message },
        { status: 400 }
      );
    }
  } else {
    const { error } = await supabase
      .from("highlight_comment_reactions")
      .insert({ comment_id: commentId, user_id: sessionUser.id, emoji });
    if (error) {
      return NextResponse.json(
        { message: "반응 저장 실패", error: error.message },
        { status: 400 }
      );
    }
  }

  // Return updated reaction summary
  const { data: reactions } = await supabase
    .from("highlight_comment_reactions")
    .select("emoji, user_id, user:users(nickname)")
    .eq("comment_id", commentId);

  const summary = summarizeReactions(
    (reactions ?? []).map((r) => ({
      emoji: r.emoji,
      user_id: r.user_id,
      user: Array.isArray(r.user) ? r.user[0] : r.user,
    })),
    sessionUser.id
  );

  return NextResponse.json(summary);
}
