import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 }
    );
  }

  const reviewId = (await ctx.params).id;
  const body = await req.json();
  const { highlightText, startPos, endPos } = body as {
    highlightText: string;
    startPos: number;
    endPos: number;
  };

  if (!highlightText || startPos == null || endPos == null) {
    return NextResponse.json(
      { message: "필수 값이 누락되었습니다." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("review_highlights")
    .insert({
      review_id: reviewId,
      author_id: sessionUser.id,
      highlight_text: highlightText,
      start_pos: startPos,
      end_pos: endPos,
    })
    .select(
      "id, highlight_text, start_pos, end_pos, author:users!review_highlights_author_id_fkey(nickname)"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { message: "하이라이트 저장 실패", error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: data.id,
    highlightText: data.highlight_text,
    startPos: data.start_pos,
    endPos: data.end_pos,
    authorNickname:
      (data.author as { nickname: string } | null)?.nickname ?? "익명",
    comments: [],
  });
}
