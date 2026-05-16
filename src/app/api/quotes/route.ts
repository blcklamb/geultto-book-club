import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { awardQuoteSubmissionPoints } from "@/lib/points";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "구절은 승인된 멤버만 추가할 수 있습니다.");
    return NextResponse.redirect(url, 303);
  }

  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  const text = formData.get("text")?.toString();
  const pageNumber = formData.get("pageNumber")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString();

  if (!scheduleId || !text) {
    const target =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : "/quotes";
    const url = new URL(target, req.url);
    url.searchParams.set("error", "필수 정보가 누락되었습니다.");
    return NextResponse.redirect(url, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert([
      {
        schedule_id: scheduleId,
        author_id: sessionUser.id,
        text,
        page_number: pageNumber,
      },
    ])
    .select("id")
    .single();

  if (error) {
    const target =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : "/quotes";
    const url = new URL(target, req.url);
    url.searchParams.set("error", `구절 등록 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }
  await awardQuoteSubmissionPoints(supabase, {
    userId: sessionUser.id,
    scheduleId,
    quoteId: data.id,
  });

  const fallbackUrl = `/schedule/${scheduleId}`;
  const target =
    redirectTo && redirectTo.startsWith("/")
      ? redirectTo
      : fallbackUrl;

  const url = new URL(target, req.url);
  url.searchParams.set("success", "구절이 등록되었습니다.");
  return NextResponse.redirect(url, 303);
}
