import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin" || sessionUser.isDeactivated) {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "관리자 전용 페이지입니다");
    return NextResponse.redirect(url, 303);
  }

  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  const isDeactivated = formData.get("isDeactivated") === "true";

  if (!userId) {
    const url = new URL("/admin/points", req.url);
    url.searchParams.set("error", "사용자 정보가 누락되었습니다");
    return NextResponse.redirect(url, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({ is_deactivated: isDeactivated })
    .eq("id", userId);

  if (error) {
    const url = new URL("/admin/points", req.url);
    url.searchParams.set("error", `상태 변경 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }

  const url = new URL("/admin/points", req.url);
  url.searchParams.set("success", "사용자 상태가 변경되었습니다");
  return NextResponse.redirect(url, 303);
}
