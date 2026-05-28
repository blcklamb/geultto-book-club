import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { parseTimetableItemsJson } from "@/lib/schedule-timetable";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  const { id } = await params;
  const redirectUrl = new URL(`/schedule/${id}`, req.url);

  if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
    redirectUrl.searchParams.set("error", "승인된 멤버만 타임테이블을 수정할 수 있습니다");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const formData = await req.formData();
  let items;
  try {
    items = parseTimetableItemsJson(formData.get("items")?.toString() ?? null);
  } catch (error) {
    redirectUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "타임테이블 저장에 실패했습니다",
    );
    return NextResponse.redirect(redirectUrl, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data: schedule } = await supabase
    .from("schedules")
    .select("id")
    .eq("id", id)
    .single();

  if (!schedule) {
    redirectUrl.searchParams.set("error", "일정을 찾을 수 없습니다");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const { error: deleteError } = await supabase
    .from("schedule_timetable_items")
    .delete()
    .eq("schedule_id", id);

  if (deleteError) {
    redirectUrl.searchParams.set("error", `타임테이블 저장 실패: ${deleteError.message}`);
    return NextResponse.redirect(redirectUrl, 303);
  }

  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from("schedule_timetable_items")
      .insert(
        items.map((item, index) => ({
          schedule_id: id,
          position: index,
          start_time: item.startTime,
          end_time: item.endTime,
          detail: item.detail,
        })),
      );

    if (insertError) {
      redirectUrl.searchParams.set("error", `타임테이블 저장 실패: ${insertError.message}`);
      return NextResponse.redirect(redirectUrl, 303);
    }
  }

  redirectUrl.searchParams.set("success", "타임테이블이 저장되었습니다");
  return NextResponse.redirect(redirectUrl, 303);
}
