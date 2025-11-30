import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ message: "관리자 전용" }, { status: 403 });
  }
  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  const role = formData.get("role")?.toString() as
    | "pending"
    | "member"
    | "admin";
  if (!userId || !role) {
    return NextResponse.json(
      { message: "userId/role이 필요합니다." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) {
    return NextResponse.json(
      { message: "업데이트 실패", error: error.message },
      { status: 400 }
    );
  }
  return NextResponse.redirect(new URL("/admin/users", req.url));
}
