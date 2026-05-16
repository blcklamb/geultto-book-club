import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DetailHeader from "@/components/DetailHeader";
import { CohortFilter } from "@/components/CohortFilter";
import { LocalizedDate } from "@/components/LocalizedDate";

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
      <div className="space-y-6 p-8">
        {cohorts.length > 0 ? (
          <CohortFilter cohorts={cohorts} selected={cohortValue} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {schedules?.map((schedule) => (
            <Link key={schedule.id} href={`/schedule/${schedule.id}`}>
              <Card className="h-full transition hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    {schedule.book_title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>
                    <LocalizedDate
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
                    <p className="text-xs text-emerald-600">
                      관리자: 회비 및 참석자 관리 가능
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
