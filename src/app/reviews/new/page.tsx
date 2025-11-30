import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { ReviewEditor } from "@/components/ReviewEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailHeader from "@/components/DetailHeader";

// Review creation page (member/admin only)
// Props: none
// Queries: schedules list for dropdown
// Access control: enforced by ensureRole in server component and AuthGuard in client if needed
export default async function ReviewCreatePage() {
  const user = await ensureRole(["member", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, book_title, date")
    .order("date", { ascending: false });

  return (
    <>
      <DetailHeader title="독후감 작성하기" />
      <div className="p-8">
        <form action="/api/reviews" method="post" className="space-y-6">
          <input type="hidden" name="authorId" value={user.id} />
          <div className="space-y-2">
            <Label htmlFor="scheduleId">어떤 모임인가요?</Label>
            <Select name="scheduleId" defaultValue={schedules?.[0]?.id}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="어떤 모임인가요?" />
              </SelectTrigger>
              <SelectContent>
                {schedules?.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.book_title} ·{" "}
                    {new Date(schedule.date).toLocaleDateString("ko-KR")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input id="title" name="title" placeholder="독후감 제목" required />
          </div>
          <div className="space-y-2">
            <Label>본문</Label>
            <ReviewEditor />
          </div>
          <Button type="submit">독후감 등록</Button>
        </form>
      </div>
    </>
  );
}
