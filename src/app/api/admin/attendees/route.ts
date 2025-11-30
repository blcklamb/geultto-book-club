import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ message: "관리자 전용" }, { status: 403 });
  }
  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  if (!scheduleId) {
    return NextResponse.json(
      { message: "scheduleId가 필요합니다." },
      { status: 400 }
    );
  }

  const userIds = formData.getAll("userIds").map((id) => id?.toString() || "");

  const updates: Array<{
    schedule_id: string;
    user_id: string;
    is_attending: boolean;
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
      fee_paid: feePaid,
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_attendees")
    .upsert(updates, { onConflict: "schedule_id,user_id" });
  if (error) {
    return NextResponse.json(
      { message: "업데이트 실패", error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.redirect(
    new URL(`/admin/attendees/${scheduleId}`, req.url)
  );
}
