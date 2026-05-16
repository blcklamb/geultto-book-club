import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "관리자 전용 페이지입니다");
    return NextResponse.redirect(url, 303);
  }
  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  if (!scheduleId) {
    const url = new URL("/admin/schedule", req.url);
    url.searchParams.set("error", "일정 정보가 누락되었습니다");
    return NextResponse.redirect(url, 303);
  }

  const userIds = formData.getAll("userIds").map((id) => id?.toString() || "");

  const updates: Array<{
    schedule_id: string;
    user_id: string;
    is_attending: boolean;
    requested_attending: boolean;
    actual_attended: boolean;
    fee_paid: boolean;
  }> = [];
  for (const userId of userIds) {
    if (!userId) continue;
    const isAttending =
      formData.get(`attending_${userId}`) === "on" ||
      formData.get(`attending_${userId}`) === "true";
    const feePaid =
      formData.get(`fee_${userId}`) === "on" ||
      formData.get(`fee_${userId}`) === "true";
    updates.push({
      schedule_id: scheduleId,
      user_id: userId,
      is_attending: isAttending,
      requested_attending: isAttending,
      actual_attended:
        formData.get(`actual_${userId}`) === "on" ||
        formData.get(`actual_${userId}`) === "true",
      fee_paid: feePaid,
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_attendees")
    .upsert(updates, { onConflict: "schedule_id,user_id" });
  if (error) {
    const url = new URL(`/admin/attendees/${scheduleId}`, req.url);
    url.searchParams.set("error", `저장 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }

  const url = new URL(`/admin/attendees/${scheduleId}`, req.url);
  url.searchParams.set("success", "참석자 상태가 저장되었습니다");
  return NextResponse.redirect(url, 303);
}
