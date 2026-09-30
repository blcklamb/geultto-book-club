import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DetailHeader from "@/components/DetailHeader";
import { ScheduleDate } from "@/components/ScheduleDate";
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
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-8">
        <section className="space-y-2 border-b border-border pb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            {schedule.book_title}
          </h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <ScheduleDate
                value={schedule.date}
                options={{ dateStyle: "medium", timeStyle: "short" }}
              />
            </p>
            <p>{schedule.place}</p>
            {schedule.book_link ? (
              <a
                className="inline-block rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={schedule.book_link}
                target="_blank"
                rel="noreferrer"
              >
                도서 정보 보기
              </a>
            ) : null}
          </div>
        </section>

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
              <CardTitle className="text-base">참석 여부</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <form
                action={`/api/schedule/${schedule.id}/attendees`}
                method="post"
                className="space-y-2"
              >
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <input type="hidden" name="userId" value={sessionUser.id} />
                <fieldset className="flex flex-wrap items-center gap-4 text-foreground">
                  <legend className="sr-only">참석 여부</legend>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-primary"
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
                      className="h-4 w-4 accent-primary"
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
                </fieldset>
                <Button type="submit" size="sm">
                  참석 상태 저장
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                {myAttendance?.fee_paid ? (
                  <span className="font-semibold text-success">
                    회비 납부 완료
                  </span>
                ) : (
                  <span className="font-semibold text-warning">
                    회비 미납
                  </span>
                )}
                {" · "}
                납부 현황은 운영진이 확인 후 수정해요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              참석 여부는 관리자 승인을 받은 멤버만 표시할 수 있어요.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              인상 깊은 구절
            </h2>
          </div>
          {sessionUser &&
          sessionUser.role !== "pending" &&
          !sessionUser.isDeactivated ? (
            <form action="/api/quotes" method="post">
              <input type="hidden" name="scheduleId" value={schedule.id} />
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-muted-foreground">
                  쪽수
                  <Input
                    name="pageNumber"
                    inputMode="numeric"
                    className="w-24"
                    placeholder="128"
                  />
                </label>
                <Input
                  name="text"
                  aria-label="인상 깊은 구절"
                  className="flex-1"
                  placeholder="인상 깊은 문장을 입력하세요"
                  required
                />
                <Button type="submit" size="sm">
                  추가
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              승인된 멤버만 구절을 등록할 수 있습니다.
            </p>
          )}
          {quotes && quotes.length > 0 ? (
            <ul className="divide-y divide-border border-y border-border">
              {quotes.map((quote) => (
                <li key={quote.id} className="space-y-1 py-4 text-sm">
                  <p className="text-xs text-muted-foreground">
                    p.{quote.page_number}
                  </p>
                  <p className="text-foreground">“{quote.text}”</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              이 모임에 등록된 구절이 아직 없어요. 기억에 남는 문장을 첫 번째로
              남겨 보세요.
            </p>
          )}
        </div>

        {sessionUser?.role === "admin" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">참석자 및 회비 관리</CardTitle>
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
                            className="h-4 w-4 accent-primary"
                            aria-label={`${attendee.user?.nickname ?? attendee.user_id} 참석 신청`}
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
                            className="h-4 w-4 accent-primary"
                            aria-label={`${attendee.user?.nickname ?? attendee.user_id} 실제 참석`}
                            name={`actual_${attendee.user_id}`}
                            defaultChecked={!!attendee.actual_attended}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            aria-label={`${attendee.user?.nickname ?? attendee.user_id} 회비 납부`}
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
