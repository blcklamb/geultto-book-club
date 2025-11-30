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

  const updates: Array<{
    schedule_id: string;
    user_id: string;
    is_attending: boolean;
    fee_paid: boolean;
  }> = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("attending_")) {
      const userId = key.replace("attending_", "");
      const isAttending = value === "on" || value === "true";
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
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
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
