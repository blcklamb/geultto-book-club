import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Admin attendee management page for a specific schedule.
export default async function AdminAttendeesPage({
  params,
}: {
  params: { scheduleId: string };
}) {
  await ensureRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, book_title, date")
    .eq("id", params.scheduleId)
    .single();

  const { data: attendees } = await supabase
    .from("schedule_attendees")
    .select(
      "user_id, is_attending, fee_paid, user:users!schedule_attendees_user_id_fkey(nickname)"
    )
    .eq("schedule_id", params.scheduleId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{schedule?.book_title ?? "모임"} 참석자 관리</CardTitle>
        <p className="text-xs text-slate-500">
          참석 여부나 회비 상태 변경 시 아래 폼을 제출하면 PATCH
          /api/admin/attendees 로 전달됩니다.
        </p>
      </CardHeader>
      <CardContent>
        <form action="/api/admin/attendees" method="post" className="space-y-4">
          <input type="hidden" name="scheduleId" value={params.scheduleId} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>닉네임</TableHead>
                <TableHead>참석</TableHead>
                <TableHead>회비 납부</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees?.map((attendee) => (
                <TableRow key={attendee.user_id}>
                  <TableCell>
                    {attendee.user?.nickname ?? attendee.user_id}
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      name={`attending_${attendee.user_id}`}
                      defaultChecked={!!attendee.is_attending}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      name={`fee_${attendee.user_id}`}
                      defaultChecked={!!attendee.fee_paid}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="submit">참석자 상태 저장</Button>
        </form>
      </CardContent>
    </Card>
  );
}
