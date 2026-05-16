import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "관리자 전용 페이지입니다");
    return NextResponse.redirect(url, 303);
  }
  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  const role = formData.get("role")?.toString() as
    | "pending"
    | "member"
    | "admin";
  if (!userId || !role) {
    const url = new URL("/admin/users", req.url);
    url.searchParams.set("error", "필수 값이 누락되었습니다");
    return NextResponse.redirect(url, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) {
    const url = new URL("/admin/users", req.url);
    url.searchParams.set("error", `승인 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }
  const url = new URL("/admin/users", req.url);
  url.searchParams.set("success", "회원이 승인되었습니다");
  return NextResponse.redirect(url, 303);
}
