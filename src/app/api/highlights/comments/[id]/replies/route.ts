import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 }
    );
  }

  const commentId = (await ctx.params).id;
  const { body } = (await req.json()) as { body: string };

  if (!body?.trim()) {
    return NextResponse.json(
      { message: "답글 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("highlight_comment_replies")
    .insert({
      comment_id: commentId,
      author_id: sessionUser.id,
      body: body.trim(),
    })
    .select(
      "id, body, created_at, author:users!highlight_comment_replies_author_id_fkey(nickname)"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { message: "답글 작성 실패", error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: data.id,
    body: data.body,
    author:
      (data.author as { nickname: string } | null)?.nickname ?? "익명",
    createdAt: data.created_at,
  });
}
