import { parseComment } from "@/lib/content-images";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { awardReviewCommentPoints } from "@/lib/points";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/reviews/[id]/comment">,
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

  const supabase = await createSupabaseServerClient();

  const formData = await req.formData();
  let payload: ReturnType<typeof parseComment>;
  try {
    payload = parseComment(
      formData.get("body") ?? "",
      JSON.parse(formData.get("imagePaths")?.toString() ?? "[]"),
      sessionUser.id,
    );
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
  const reviewId = (await ctx.params).id;

  const { data, error } = await supabase
    .from("review_comments")
    .insert([
      {
        review_id: reviewId,
        author_id: sessionUser.id,
        ...payload,
      },
    ])
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { message: "댓글 작성 실패", error: error.message },
      { status: 400 },
    );
  }
  const { data: review } = await supabase
    .from("reviews")
    .select("id, schedule_id, author_id")
    .eq("id", reviewId)
    .single();

  if (review?.schedule_id) {
    await awardReviewCommentPoints(supabase, {
      userId: sessionUser.id,
      scheduleId: review.schedule_id,
      reviewId,
      reviewAuthorId: review.author_id,
      commentId: data.id,
    });
  }
  return NextResponse.json({ ok: true });
}
