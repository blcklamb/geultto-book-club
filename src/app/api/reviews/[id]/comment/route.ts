import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/reviews/[id]/comment">
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const formData = await req.formData();
  const payload = {
    body: formData.get("body")?.toString(),
  };
  const reviewId = (await ctx.params).id;

  if (!payload.body) {
    return NextResponse.json(
      { message: "댓글 내용을 입력해주세요." },
      { status: 400 }
    );
  }
  const { error } = await supabase.from("review_comments").insert([
    {
      review_id: reviewId,
      author_id: sessionUser.id,
      body: payload.body,
    },
  ]);
  if (error) {
    return NextResponse.json(
      { message: "댓글 작성 실패", error: error.message },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
