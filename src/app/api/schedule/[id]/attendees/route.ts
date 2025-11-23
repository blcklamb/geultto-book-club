import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/schedule/[id]/attendees">
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "승인된 회원만 참석 상태를 변경할 수 있습니다." },
      { status: 403 }
    );
  }
  const formData = await req.formData();
  const scheduleId = (await ctx.params).id;
  const userId = formData.get("userId")?.toString();
  const isAttending = formData.get("isAttending") === "true";

  if (!userId || userId !== sessionUser.id) {
    return NextResponse.json(
      { message: "본인만 수정 가능합니다." },
      { status: 403 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("schedule_attendees").upsert(
    {
      schedule_id: scheduleId,
      user_id: userId,
      is_attending: isAttending,
    },
    { onConflict: "schedule_id,user_id" }
  );

  if (error) {
    return NextResponse.json(
      { message: "갱신 실패", error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.redirect(new URL(`/schedule/${scheduleId}`, req.url));
}
