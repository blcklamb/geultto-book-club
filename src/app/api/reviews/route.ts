import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { awardReviewSubmissionPoints } from "@/lib/points";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (
    !sessionUser ||
    sessionUser.role === "pending" ||
    sessionUser.isDeactivated
  ) {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "승인된 회원만 작성할 수 있습니다.");
    return NextResponse.redirect(url, 303);
  }
  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  const title = formData.get("title")?.toString();
  const contentRich = formData.get("contentRich")?.toString();

  if (!scheduleId || !title || !contentRich) {
    const url = new URL("/reviews/new", req.url);
    url.searchParams.set("error", "필수 정보가 누락되었습니다.");
    return NextResponse.redirect(url, 303);
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
    console.error("Failed to create review", {
      userId: sessionUser.id,
      scheduleId,
      error,
    });

    const url = new URL("/reviews/new", req.url);
    url.searchParams.set(
      "error",
      "독후감 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
    );
    return NextResponse.redirect(url, 303);
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

  const url = new URL("/reviews", req.url);
  url.searchParams.set("success", "독후감이 등록되었습니다.");
  return NextResponse.redirect(url, 303);
}
