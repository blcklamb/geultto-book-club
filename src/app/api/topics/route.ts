import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { awardTopicSubmissionPoints } from "@/lib/points";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "승인된 회원만 작성할 수 있습니다.");
    return NextResponse.redirect(url, 303);
  }
  const formData = await req.formData();
  const scheduleId = formData.get("scheduleId")?.toString();
  const title = formData.get("title")?.toString();
  const bodyRich = formData.get("bodyRich")?.toString();
  if (!scheduleId || !title || !bodyRich) {
    const url = new URL("/topics/new", req.url);
    url.searchParams.set("error", "필수 정보가 누락되었습니다.");
    return NextResponse.redirect(url, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("topics")
    .insert([
      {
        schedule_id: scheduleId,
        author_id: sessionUser.id,
        title,
        body_rich: JSON.parse(bodyRich),
        body_markdown: null,
      },
    ])
    .select("id")
    .single();
  if (error) {
    const url = new URL("/topics/new", req.url);
    url.searchParams.set("error", `발제 등록 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }
  await awardTopicSubmissionPoints(supabase, {
    userId: sessionUser.id,
    scheduleId,
    topicId: data.id,
  });
  const url = new URL("/topics", req.url);
  url.searchParams.set("success", "발제가 등록되었습니다.");
  return NextResponse.redirect(url, 303);
}
