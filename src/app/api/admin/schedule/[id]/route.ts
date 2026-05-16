import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ message: "관리자 전용" }, { status: 403 });
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
    return NextResponse.json(
      { message: "수정 실패", error: error.message },
      { status: 400 }
    );
  }
  return NextResponse.redirect(new URL("/admin/schedule", req.url));
}
