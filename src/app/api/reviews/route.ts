import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { awardReviewSubmissionPoints } from "@/lib/points";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 }
    );
  }
  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  const title = formData.get("title")?.toString();
  const contentRich = formData.get("contentRich")?.toString();

  if (!scheduleId || !title || !contentRich) {
    return NextResponse.json(
      { message: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert([
      {
        schedule_id: scheduleId,
        author_id: sessionUser.id,
        title,
        content_rich: contentRich,
        content_markdown: null,
      },
    ])
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { message: "등록 실패", error: error.message },
      { status: 400 }
    );
  }

  const { data: schedule } = await supabase
    .from("schedules")
    .select("date")
    .eq("id", scheduleId)
    .single();

  if (schedule?.date && data.created_at) {
    await awardReviewSubmissionPoints(supabase, {
      userId: sessionUser.id,
      scheduleId,
      reviewId: data.id,
      scheduleDate: schedule.date,
      submittedAt: data.created_at,
    });
  }

  return NextResponse.redirect(new URL("/reviews", req.url));
}
