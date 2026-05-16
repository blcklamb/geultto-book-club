import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const id = (await ctx.params).id;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("review_highlights")
    .delete()
    .eq("id", id)
    .eq("author_id", sessionUser.id);

  if (error) {
    return NextResponse.json(
      { message: "하이라이트 삭제 실패", error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
