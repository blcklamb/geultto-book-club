import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Admin schedule management: create/update events.
// Access: admin only enforced via ensureRole.
export default async function AdminSchedulePage() {
  await ensureRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: schedules, error } = await supabase
    .from("schedules")
    .select("id, date, place, book_title, book_link, genre_tag")
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
        <CardContent className="space-y-4 text-sm text-slate-600">
          {schedules?.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <p className="font-semibold text-slate-800">
                {schedule.book_title}
              </p>
              <p>{new Date(schedule.date).toLocaleString("ko-KR")}</p>
              <p>{schedule.place}</p>
              <p className="text-xs text-slate-400">
                장르: {schedule.genre_tag ?? "-"}
              </p>
              <div className="mt-3 flex gap-3 text-sm">
                <a
                  className="text-sky-600"
                  href={`/admin/attendees/${schedule.id}`}
                >
                  참석자 관리
                </a>
              </div>
            </div>
          )) ?? <p>등록된 일정이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
