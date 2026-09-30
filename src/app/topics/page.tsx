import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DetailHeader from "@/components/DetailHeader";
import { CohortFilter } from "@/components/CohortFilter";
import { LocalizedDate } from "@/components/LocalizedDate";
import { UserAvatar } from "@/components/UserAvatar";
import { profileImagesByUserId } from "@/lib/profile-image";

// Topics index page listing discussion prompts.
export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const parsed = cohortParam ? Number(cohortParam) : NaN;
  const cohortValue = Number.isFinite(parsed) ? parsed : 5;

  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  const { data: cohortRows } = await supabase
    .from("schedules")
    .select("cohort")
    .not("cohort", "is", null)
    .order("cohort");
  const cohorts = [...new Set(cohortRows?.map((r) => r.cohort) ?? [])].filter(
    (c): c is number => c !== null,
  );

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
      "id, title, author_id, created_at, schedule:schedules!topics_schedule_id_fkey(book_title), author:users!topics_author_id_fkey(nickname), topic_comments(count)",
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
          .select("user_id, profile_image_url, profile_decoration")
          .in("user_id", authorIds)
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  return (
    <>
      <DetailHeader title="토론" />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground">토론 발제</h2>
            <p className="text-sm text-muted-foreground">
              모임에서 나눌 토론 주제를 올리고 댓글로 의견을 모아요.
            </p>
          </div>
          {sessionUser &&
          sessionUser.role !== "pending" &&
          !sessionUser.isDeactivated ? (
            <Button asChild>
              <Link href="/topics/new">발제 등록</Link>
            </Button>
          ) : null}
        </div>
        {cohorts.length > 0 ? (
          <CohortFilter cohorts={cohorts} selected={cohortValue} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {topics && topics.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              이 기수에 등록된 토론 발제가 아직 없어요. 다른 기수를 선택하거나
              발제를 등록해 보세요.
            </p>
          ) : null}
          {topics?.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-colors group-hover:border-input group-hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{topic.schedule?.book_title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserAvatar
                      imageUrl={
                        topic.author_id
                          ? profileImageMap.get(topic.author_id)
                              ?.profileImageUrl
                          : undefined
                      }
                      decoration={
                        topic.author_id
                          ? profileImageMap.get(topic.author_id)
                              ?.profileDecoration
                          : undefined
                      }
                      size="sm"
                    />
                    <span>
                      {topic.author?.nickname ?? "익명"} ·{" "}
                      <LocalizedDate
                        value={topic.created_at}
                        options={{
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                      />{" "}
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
