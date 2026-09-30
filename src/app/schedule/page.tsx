import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DetailHeader from "@/components/DetailHeader";
import { CohortFilter } from "@/components/CohortFilter";
import { ScheduleDate } from "@/components/ScheduleDate";

// Schedules list page accessible to everyone including pending users.
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const parsed = cohortParam ? Number(cohortParam) : NaN;
  const cohortValue = Number.isFinite(parsed) ? parsed : null;

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

  let schedulesQuery = supabase
    .from("schedules")
    .select("id, date, place, book_title, genre_tag, cohort")
    .order("date", { ascending: true });

  if (cohortValue !== null) {
    schedulesQuery = schedulesQuery.eq("cohort", cohortValue);
  }

  const { data: schedules } = await schedulesQuery;

  return (
    <>
      <DetailHeader title="독서모임 일정" />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        {cohorts.length > 0 ? (
          <CohortFilter cohorts={cohorts} selected={cohortValue} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {schedules && schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              이 기수에 등록된 모임 일정이 없어요. 다른 기수를 선택해 보세요.
            </p>
          ) : null}
          {schedules?.map((schedule) => (
            <Link
              key={schedule.id}
              href={`/schedule/${schedule.id}`}
              className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-colors group-hover:border-input group-hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-base">
                    {schedule.book_title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <ScheduleDate
                      value={schedule.date}
                      options={{ dateStyle: "medium", timeStyle: "short" }}
                    />
                  </p>
                  <p>{schedule.place}</p>
                  <div className="flex gap-2">
                    {schedule.genre_tag ? (
                      <Badge variant="outline">{schedule.genre_tag}</Badge>
                    ) : null}
                    {schedule.cohort ? (
                      <Badge variant="secondary">{schedule.cohort}기</Badge>
                    ) : null}
                  </div>
                  {sessionUser?.role === "admin" ? (
                    <p className="text-xs text-muted-foreground">
                      상세 화면에서 참석자와 회비를 관리할 수 있어요.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
