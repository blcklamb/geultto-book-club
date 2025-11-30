import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "구절은 승인된 멤버만 추가할 수 있습니다." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  const text = formData.get("text")?.toString();
  const pageNumber = formData.get("pageNumber")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString();

  if (!scheduleId || !text) {
    return NextResponse.json(
      { message: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quotes").insert([
    {
      schedule_id: scheduleId,
      author_id: sessionUser.id,
      text,
      page_number: pageNumber,
    },
  ]);

  if (error) {
    return NextResponse.json(
      { message: "등록 실패", error: error.message },
      { status: 400 }
    );
  }

  const fallbackUrl = `/schedule/${scheduleId}`;
  const target =
    redirectTo && redirectTo.startsWith("/")
      ? redirectTo
      : fallbackUrl;

  return NextResponse.redirect(new URL(target, req.url));
}
