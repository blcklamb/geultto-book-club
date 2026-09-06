import { parseComment } from "@/lib/content-images";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { awardReviewCommentPoints } from "@/lib/points";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (
    !sessionUser ||
    sessionUser.role === "pending" ||
    sessionUser.isDeactivated
  ) {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 },
    );
  }

  const highlightId = (await ctx.params).id;
  let payload: ReturnType<typeof parseComment>;
  try {
    const { body, imagePaths } = await req.json();
    payload = parseComment(body, imagePaths, sessionUser.id);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "댓글 입력값이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("highlight_comments")
    .insert({
      highlight_id: highlightId,
      author_id: sessionUser.id,
      ...payload,
    })
    .select(
      "id, body, image_paths, created_at, author:users!highlight_comments_author_id_fkey(nickname)",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { message: "댓글 작성 실패", error: error.message },
      { status: 400 },
    );
  }

  const { data: highlight } = await supabase
    .from("review_highlights")
    .select(
      "review_id, review:reviews!review_highlights_review_id_fkey(id, schedule_id, author_id)",
    )
    .eq("id", highlightId)
    .single();

  const review = Array.isArray(highlight?.review)
    ? highlight?.review[0]
    : highlight?.review;

  if (review?.schedule_id && review.id) {
    await awardReviewCommentPoints(supabase, {
      userId: sessionUser.id,
      scheduleId: review.schedule_id,
      reviewId: review.id,
      reviewAuthorId: review.author_id,
      commentId: data.id,
    });
  }

  return NextResponse.json({
    id: data.id,
    body: data.body,
    imagePaths: data.image_paths,
    authorId: sessionUser.id,
    author: (data.author as { nickname: string } | null)?.nickname ?? "익명",
    createdAt: data.created_at,
    reactions: [],
    replies: [],
  });
}
