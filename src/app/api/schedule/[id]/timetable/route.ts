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
  const { error } = await supabase.rpc("replace_schedule_timetable_items", {
    p_schedule_id: id,
    p_items: items.map((item) => ({
      start_time: item.startTime,
      end_time: item.endTime,
      detail: item.detail,
    })),
  });

  if (error) {
    redirectUrl.searchParams.set("error", `타임테이블 저장 실패: ${error.message}`);
    return NextResponse.redirect(redirectUrl, 303);
  }

  redirectUrl.searchParams.set("success", "타임테이블이 저장되었습니다");
  return NextResponse.redirect(redirectUrl, 303);
}
