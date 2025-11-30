import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Schedules list page accessible to everyone including pending users.
// Props: none. Data is fetched server-side via Supabase (schedules table).
export default async function SchedulePage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, date, place, book_title, genre_tag")
    .order("date", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">독서모임 일정</h1>
        <p className="text-sm text-slate-500">
          다음 모임을 확인하고 참석 여부를 체크하세요.
        </p>
      </div>
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
                <p>{new Date(schedule.date).toLocaleString("ko-KR")}</p>
                <p>{schedule.place}</p>
                {schedule.genre_tag ? (
                  <Badge variant="outline">{schedule.genre_tag}</Badge>
                ) : null}
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
  );
}
