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

// Topic creation page shares editor with reviews.
export default async function TopicCreatePage() {
  const user = await ensureRole(["member", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, book_title, date")
    .order("date", { ascending: false });

  return (
    <>
      <DetailHeader title="토론 발제하기" />
      <form action="/api/topics" method="post" className="space-y-6 p-8">
        <input type="hidden" name="authorId" value={user.id} />
        <div className="space-y-2">
          <Label htmlFor="scheduleId">모임 선택</Label>
          <Select name="scheduleId">
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
          <Label htmlFor="title">발제 제목</Label>
          <Input
            id="title"
            name="title"
            placeholder="토론을 시작할 질문"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>발제 내용</Label>
          {/* name을 bodyRich로 지정해 API가 그대로 JSON을 파싱해 저장하도록 맞춥니다. */}
          <ReviewEditor name="bodyRich" />
        </div>
        <Button type="submit">발제 등록</Button>
      </form>
    </>
  );
}
