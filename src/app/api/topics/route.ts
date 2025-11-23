import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 }
    );
  }
  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  const title = formData.get("title")?.toString();
  const bodyRich = formData.get("bodyRich")?.toString();
  if (!scheduleId || !title || !bodyRich) {
    return NextResponse.json(
      { message: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("topics").insert([
    {
      schedule_id: scheduleId,
      author_id: sessionUser.id,
      title,
      body_rich: JSON.parse(bodyRich),
      body_markdown: null,
    },
  ]);
  if (error) {
    return NextResponse.json(
      { message: "등록 실패", error: error.message },
      { status: 400 }
    );
  }
  return NextResponse.redirect(new URL("/topics", req.url));
}
