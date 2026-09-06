import { parseComment } from "@/lib/content-images";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/topics/[id]/comment">,
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
  const topicId = (await ctx.params).id;

  const { error } = await supabase.from("topic_comments").insert([
    {
      topic_id: topicId,
      author_id: sessionUser.id,
      ...payload,
    },
  ]);
  if (error) {
    return NextResponse.json(
      { message: "댓글 작성 실패", error: error.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
