import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DetailHeader from "@/components/DetailHeader";
import { LocalizedDate } from "@/components/LocalizedDate";
import { UserAvatar } from "@/components/UserAvatar";
import { ScheduleTimetableEditor } from "@/components/ScheduleTimetableEditor";
import { profileImagesByUserId } from "@/lib/profile-image";
import { syncAttendancePoints } from "@/lib/points";

// Schedule detail page: shows event info, attendee state and quote submission.
// Params: { params: { id: string } }
// Queries:
//   * schedules by id
//   * schedule_attendees for admin and current user context
//   * quotes scoped to schedule
// Access control:
//   * Everyone can view
//   * Only member/admin can POST attendance updates or add quotes (handled by API routes)
export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const scheduleId = (await params).id;
  if (sessionUser && !sessionUser.isDeactivated) {
    await syncAttendancePoints(supabase);
  }

  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, date, place, book_title, book_link, genre_tag")
    .eq("id", scheduleId)
    .single();

  if (!schedule) {
    notFound();
  }

  const { data: attendees } = await supabase
    .from("schedule_attendees")
    .select(
      "user_id, is_attending, requested_attending, actual_attended, fee_paid, user:users!schedule_attendees_user_id_fkey(nickname)",
    )
    .eq("schedule_id", scheduleId);

  const { data: timetableItems } = await supabase
    .from("schedule_timetable_items")
    .select("id, start_time, end_time, detail")
    .eq("schedule_id", scheduleId)
    .order("position", { ascending: true });

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, text, page_number, author_id, author:users!quotes_author_id_fkey(nickname)",
    )
    .eq("schedule_id", scheduleId)
    .order("created_at", { ascending: false });
  const quoteAuthorIds = [
    ...new Set((quotes ?? []).map((quote) => quote.author_id).filter(Boolean)),
  ] as string[];
  const { data: quoteAvatarRows } =
    quoteAuthorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url, profile_decoration")
          .in("user_id", quoteAuthorIds)
      : { data: [] };
  const quoteProfileImageMap = profileImagesByUserId(quoteAvatarRows);

  const myAttendance = attendees?.find(
    (att) => att.user_id === sessionUser?.id,
  );
  const canEditTimetable =
    !!sessionUser &&
    sessionUser.role !== "pending" &&
    !sessionUser.isDeactivated;

  return (
    <>
      <DetailHeader title={schedule.book_title} />
      <div className="space-y-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
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
            {schedule.book_link ? (
              <a
                className="text-slate-500 underline"
                href={schedule.book_link}
                target="_blank"
                rel="noreferrer"
              >
                도서 정보 바로가기
              </a>
            ) : null}
          </CardContent>
        </Card>

        <ScheduleTimetableEditor
          scheduleId={schedule.id}
          items={
            timetableItems?.map((item) => ({
              id: item.id,
              startTime: item.start_time,
              endTime: item.end_time,
              detail: item.detail,
            })) ?? []
          }
          canEdit={canEditTimetable}
        />

        {sessionUser &&
        sessionUser.role !== "pending" &&
        !sessionUser.isDeactivated ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">참석 여부</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <form
                action={`/api/schedule/${schedule.id}/attendees`}
                method="post"
                className="space-y-2"
              >
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <input type="hidden" name="userId" value={sessionUser.id} />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="isAttending"
                      value="true"
                      defaultChecked={
                        myAttendance?.requested_attending ??
                        myAttendance?.is_attending ??
                        false
                      }
                    />
                    참석합니다
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="isAttending"
                      value="false"
                      defaultChecked={
                        !(
                          myAttendance?.requested_attending ??
                          myAttendance?.is_attending ??
                          false
                        )
                      }
                    />
                    참석이 어려워요
                  </label>
                </div>
                <Button type="submit" size="sm">
                  참석 상태 저장
                </Button>
              </form>
              <p className="text-xs text-slate-400">
                {myAttendance?.fee_paid ? (
                  <span className="text-xs text-emerald-600">
                    회비를 납부하셨습니다.
                  </span>
                ) : (
                  <span className="text-xs text-rose-600">
                    회비 미납 상태입니다.
                  </span>
                )}{" "}
                <span className="text-xs text-slate-400">
                  회비 납부 현황은 관리자만 수정할 수 있습니다.
                </span>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-sm text-slate-500">
              참석 여부 체크는 승인된 멤버만 가능합니다.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              인상 깊은 구절
            </h2>
          </div>
          {sessionUser &&
          sessionUser.role !== "pending" &&
          !sessionUser.isDeactivated ? (
            <form
              action="/api/quotes"
              method="post"
              className="space-y-2 rounded-lg border border-slate-200 p-4"
            >
              <input type="hidden" name="scheduleId" value={schedule.id} />
              <div className="flex gap-2 text-sm">
                <label className="flex items-center gap-1">
                  쪽수
                  <input
                    name="pageNumber"
                    className="h-9 w-24 rounded-md border border-slate-200 px-2"
                    placeholder="123"
                  />
                </label>
                <input
                  name="text"
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2"
                  placeholder="인상 깊은 문장을 입력하세요"
                  required
                />
                <Button type="submit" size="sm">
                  추가
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              승인된 멤버만 구절을 등록할 수 있습니다.
            </p>
          )}
          <div className="space-y-3">
            {quotes?.map((quote) => (
              <Card key={quote.id}>
                <CardContent className="pt-6 space-y-1 text-sm text-slate-600">
                  <p className="text-xs text-slate-400">
                    p.{quote.page_number}
                  </p>
                  <p>“{quote.text}”</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <UserAvatar
                      imageUrl={
                        quote.author_id
                          ? quoteProfileImageMap.get(quote.author_id)
                              ?.profileImageUrl
                          : undefined
                      }
                      decoration={
                        quote.author_id
                          ? quoteProfileImageMap.get(quote.author_id)
                              ?.profileDecoration
                          : undefined
                      }
                      size="sm"
                    />
                    <span>{quote.author?.nickname}</span>
                  </div>
                </CardContent>
              </Card>
            )) ?? (
              <p className="text-sm text-slate-500">등록된 구절이 없습니다.</p>
            )}
          </div>
        </div>

        {sessionUser?.role === "admin" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">참석자 및 회비 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <form action="/api/admin/attendees" method="post">
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>닉네임</TableHead>
                      <TableHead>참석 신청</TableHead>
                      <TableHead>실제 참석</TableHead>
                      <TableHead>회비 납부</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendees?.map((attendee) => (
                      <TableRow key={attendee.user_id}>
                        <TableCell>
                          <input
                            type="hidden"
                            name="userIds"
                            value={attendee.user_id}
                          />
                          {attendee.user?.nickname ?? attendee.user_id}
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            name={`attending_${attendee.user_id}`}
                            defaultChecked={
                              attendee.requested_attending ??
                              attendee.is_attending ??
                              false
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            name={`actual_${attendee.user_id}`}
                            defaultChecked={!!attendee.actual_attended}
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
                <Button type="submit" className="mt-4">
                  참석자 상태 업데이트
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
