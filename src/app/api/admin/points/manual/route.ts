import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import {
  MANUAL_POINT_OPTIONS,
  CURRENT_POINT_COHORT,
  awardPointTransaction,
  type PointSourceType,
} from "@/lib/points";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin" || sessionUser.isDeactivated) {
    return NextResponse.json({ message: "관리자 전용" }, { status: 403 });
  }

  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  const scheduleId = formData.get("scheduleId")?.toString() || null;
  const sourceType = formData.get("sourceType")?.toString() as
    | PointSourceType
    | undefined;
  const memo = formData.get("memo")?.toString() || null;

  const option = MANUAL_POINT_OPTIONS.find(
    (item) => item.sourceType === sourceType
  );

  if (!userId || !sourceType || !option) {
    return NextResponse.json(
      { message: "사용자와 포인트 항목을 선택해주세요." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  await awardPointTransaction(supabase, {
    userId,
    scheduleId,
    sourceType,
    points: option.points,
    memo,
    createdBy: sessionUser.id,
    cohort: CURRENT_POINT_COHORT,
    idempotencyKey: `manual:${sourceType}:${userId}:${crypto.randomUUID()}`,
  });

  return NextResponse.redirect(new URL("/admin/points", req.url));
}
