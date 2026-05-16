import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin" || sessionUser.isDeactivated) {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "관리자 전용 페이지입니다");
    return NextResponse.redirect(url, 303);
  }
  const { id } = await params;
  const formData = await req.formData();
  const cohortRaw = formData.get("cohort")?.toString();
  const cohort = cohortRaw ? Number(cohortRaw) : null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("schedules")
    .update({ cohort })
    .eq("id", id);

  if (error) {
    const url = new URL("/admin/schedule", req.url);
    url.searchParams.set("error", `수정 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }
  const url = new URL("/admin/schedule", req.url);
  url.searchParams.set("success", "기수가 업데이트되었습니다");
  return NextResponse.redirect(url, 303);
}
