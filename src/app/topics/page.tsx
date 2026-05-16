import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DetailHeader from "@/components/DetailHeader";
import { CohortFilter } from "@/components/CohortFilter";
import { UserAvatar } from "@/components/UserAvatar";
import { profileImagesByUserId } from "@/lib/profile-image";

// Topics index page listing discussion prompts.
export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const cohortValue = cohortParam ? Number(cohortParam) : null;

  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  const { data: cohortRows } = await supabase
    .from("schedules")
    .select("cohort")
    .not("cohort", "is", null)
    .order("cohort");
  const cohorts = [
    ...new Set(cohortRows?.map((r) => r.cohort) ?? []),
  ].filter((c): c is number => c !== null);

  let scheduleIds: string[] | null = null;
  if (cohortValue !== null) {
    const { data: cohortSchedules } = await supabase
      .from("schedules")
      .select("id")
      .eq("cohort", cohortValue);
    scheduleIds = cohortSchedules?.map((s) => s.id) ?? [];
  }

  let topicsQuery = supabase
    .from("topics")
    .select(
      "id, title, author_id, created_at, schedule:schedules!topics_schedule_id_fkey(book_title), author:users!topics_author_id_fkey(nickname), topic_comments(count)"
    )
    .order("created_at", { ascending: false });

  if (scheduleIds !== null) {
    topicsQuery = topicsQuery.in("schedule_id", scheduleIds);
  }

  const { data: topics } = await topicsQuery;
  const authorIds = [
    ...new Set((topics ?? []).map((topic) => topic.author_id).filter(Boolean)),
  ] as string[];
  const { data: avatarRows } =
    authorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url")
          .in("user_id", authorIds)
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  return (
    <>
      <DetailHeader title="토론" />

      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">토론 발제</h1>
            <p className="text-sm text-slate-500">토론 주제를 공유해요.</p>
          </div>
          {sessionUser && sessionUser.role !== "pending" ? (
            <Link href="/topics/new">
              <Button>발제 등록</Button>
            </Link>
          ) : null}
        </div>
        {cohorts.length > 0 ? (
          <CohortFilter cohorts={cohorts} selected={cohortValue} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {topics?.map((topic) => (
            <Link key={topic.id} href={`/topics/${topic.id}`}>
              <Card className="transition hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">{topic.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p>{topic.schedule?.book_title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <UserAvatar
                      imageUrl={
                        topic.author_id
                          ? profileImageMap.get(topic.author_id)?.profileImageUrl
                          : undefined
                      }
                      size="sm"
                    />
                    <span>
                      {topic.author?.nickname ?? "익명"} ·{" "}
                      {new Date(topic.created_at || "").toLocaleDateString(
                        "ko-KR"
                      )}{" "}
                      · 댓글 {topic.topic_comments?.[0]?.count ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
