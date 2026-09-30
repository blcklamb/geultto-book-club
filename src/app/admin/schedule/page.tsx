import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleDate } from "@/components/ScheduleDate";

// Admin schedule management: create/update events.
// Access: admin only enforced via ensureRole.
export default async function AdminSchedulePage() {
  await ensureRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: schedules, error } = await supabase
    .from("schedules")
    .select("id, date, place, book_title, book_link, genre_tag, cohort")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>새 일정 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action="/api/admin/schedule"
            method="post"
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="date">모임 일시</Label>
              <Input type="datetime-local" id="date" name="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place">장소</Label>
              <Input id="place" name="place" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bookTitle">선정 도서</Label>
              <Input id="bookTitle" name="bookTitle" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bookLink">도서 링크</Label>
              <Input id="bookLink" name="bookLink" placeholder="https://" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">장르 태그</Label>
              <Input id="genre" name="genre" placeholder="에세이" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cohort">기수</Label>
              <Input
                id="cohort"
                name="cohort"
                type="number"
                placeholder="예: 5"
              />
            </div>
            <Button type="submit" className="md:col-span-2">
              일정 저장
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>등록된 일정</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border text-sm text-muted-foreground">
          {schedules?.length ? null : (
            <p>등록된 일정이 없습니다. 위 양식으로 첫 일정을 추가해 주세요.</p>
          )}
          {schedules?.map((schedule) => (
            <div
              key={schedule.id}
              className="py-4 first:pt-0 last:pb-0"
            >
              <p className="font-semibold text-foreground">
                {schedule.book_title}
              </p>
              <p>
                <ScheduleDate
                  value={schedule.date}
                  options={{ dateStyle: "medium", timeStyle: "short" }}
                />
              </p>
              <p>{schedule.place}</p>
              <p className="text-xs text-muted-foreground">
                장르: {schedule.genre_tag ?? "-"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  className="rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/admin/attendees/${schedule.id}`}
                >
                  참석자 관리
                </a>
                <form
                  action={`/api/admin/schedule/${schedule.id}`}
                  method="post"
                  className="flex items-center gap-2"
                >
                  <Label htmlFor={`cohort-${schedule.id}`} className="text-xs">
                    기수
                  </Label>
                  <Input
                    id={`cohort-${schedule.id}`}
                    name="cohort"
                    type="number"
                    defaultValue={schedule.cohort ?? ""}
                    placeholder="-"
                    className="h-7 w-20 text-xs"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    저장
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
