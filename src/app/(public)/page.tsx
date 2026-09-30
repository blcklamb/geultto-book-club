import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { HomeScene3DLazy } from "@/components/HomeScene3DLazy";
import { NaverMapCopyButton } from "@/components/NaverMapCopyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocalizedDate } from "@/components/LocalizedDate";
import { ScheduleDate } from "@/components/ScheduleDate";
import { SummerPaletteViewerCard } from "@/features/summer-palette/components/SummerPaletteViewerCard";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  // Fetch next schedule (nearest future date)
  const nowIso = new Date().toISOString();

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, date, place, book_title, book_link")
    .gte("date", nowIso)
    .order("date", { ascending: true })
    .limit(1);

  // Fetch summaries tailored to logged-in state.
  const { data: recentReviews } = sessionUser
    ? await supabase
        .from("reviews")
        .select("id, title, schedules(book_title), created_at")
        .eq("author_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const { data: recentTopics } = sessionUser
    ? await supabase
        .from("topics")
        .select(
          "id, title, schedules(book_title), created_at, topic_comments(count)",
        )
        .eq("author_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const { data: summerPaletteRow } = sessionUser
    ? await supabase
        .from("summer_palette_boards")
        .select("updated_at")
        .eq("user_id", sessionUser.id)
        .maybeSingle()
    : { data: null };

  const nextSchedule = schedules?.[0]
    ? {
        id: schedules[0].id,
        date: schedules[0].date,
        place: schedules[0].place,
        book: schedules[0].book_title,
        bookLink: schedules[0].book_link,
      }
    : undefined;

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              글또 5기 독서모임
            </h1>
            <p className="text-base text-muted-foreground">
              다음 모임 일정과 내가 쓴 독후감, 토론 발제를 한곳에서 확인해요.
            </p>
          </div>
          <HomeScene3DLazy
            nextSchedule={nextSchedule}
            bookCoverUrl={nextSchedule?.bookLink}
          />
          {sessionUser ? (
            <SummerPaletteViewerCard
              updatedAt={summerPaletteRow?.updated_at}
            />
          ) : null}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">다음 독서모임 일정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {nextSchedule ? (
                <>
                  <p className="font-semibold text-foreground">
                    {nextSchedule.book}
                  </p>
                  <p>
                    <ScheduleDate
                      value={nextSchedule.date}
                      options={{
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      }}
                    />
                  </p>
                  <div className="flex items-center gap-2">
                    <p>{nextSchedule.place}</p>
                    <NaverMapCopyButton searchValue={schedules?.[0]?.place} />
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                  >
                    <Link href={`/schedule/${nextSchedule.id}`}>
                      일정 상세 보기
                    </Link>
                  </Button>
                </>
              ) : (
                <p>
                  아직 등록된 다음 모임 일정이 없습니다. 일정이 정해지면 이곳에
                  표시됩니다.
                </p>
              )}
            </CardContent>
          </Card>
          {!sessionUser ? (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-muted-foreground">
                  로그인하면 독후감과 토론 발제를 쓰고, 인상 깊은 구절을 모을 수
                  있습니다.
                </p>
                <Button asChild className="w-full">
                  <Link href="/auth/login">카카오로 로그인</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    내가 작성한 최근 독후감
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentReviews?.length ? (
                    <ul className="-mx-2 divide-y divide-border">
                      {/* TODO: 타입 수정 필요 */}
                      {recentReviews.map((review: any) => (
                        <li key={review.id}>
                          <Link
                            href={`/reviews/${review.id}`}
                            className="block rounded-md px-2 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <p className="text-sm font-semibold text-foreground">
                              {review.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {review.schedules?.book_title} ·{" "}
                              <LocalizedDate
                                value={review.created_at as string}
                                options={{
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                }}
                              />
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>아직 작성한 독후감이 없습니다.</p>
                      <Link
                        href="/reviews/new"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        독후감 쓰기
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">내가 올린 토론 발제</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTopics?.length ? (
                    <ul className="-mx-2 divide-y divide-border">
                      {/* TODO: 타입 수정 필요 */}
                      {recentTopics.map((topic: any) => (
                        <li key={topic.id}>
                          <Link
                            href={`/topics/${topic.id}`}
                            className="block rounded-md px-2 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <p className="text-sm font-semibold text-foreground">
                              {topic.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {topic.schedules?.book_title} · 댓글{" "}
                              {topic.topic_comments?.[0]?.count ?? 0}개
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>아직 올린 토론 발제가 없습니다.</p>
                      <Link
                        href="/topics/new"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        발제 올리기
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
