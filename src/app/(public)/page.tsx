import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { HomeScene3D } from "@/components/HomeScene3D";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  // Fetch next schedule (nearest future date)
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, date, place, book_title")
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
          "id, title, schedules(book_title), created_at, topic_comments(count)"
        )
        .eq("author_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const nextSchedule = schedules?.[0]
    ? {
        date: new Date(schedules[0].date).toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
          weekday: "short",
        }),
        place: schedules[0].place,
        book: schedules[0].book_title,
      }
    : undefined;

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              어쩌다 4기, 글또 북클럽
            </h1>
            <p className="text-base text-slate-600">
              다음 모임 일정을 확인하고, 독후감과 토론으로 풍성한 대화를
              이어가요.
            </p>
          </div>
          <HomeScene3D nextSchedule={nextSchedule} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                다음 독서모임 일정
                {!sessionUser ? (
                  <Link href="/auth/login">
                    <Button size="sm">카카오로 로그인</Button>
                  </Link>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              {nextSchedule ? (
                <>
                  <p>{nextSchedule.date}</p>
                  <p>{nextSchedule.place}</p>
                  <p className="font-medium">📘 {nextSchedule.book}</p>
                </>
              ) : (
                <p>등록된 일정이 없습니다.</p>
              )}
            </CardContent>
          </Card>
          {!sessionUser ? (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-slate-600">
                  로그인 후 독후감, 토론 발제, 인상 깊은 구절을 함께 나눠보세요.
                </p>
                <Link href="/auth/login">
                  <Button className="w-full">카카오로 로그인</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    내가 작성한 최근 독후감
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentReviews?.length ? (
                    // TODO: 타입 수정 필요
                    recentReviews.map((review: any) => (
                      <Link
                        key={review.id}
                        href={`/reviews/${review.id}`}
                        className="block"
                      >
                        <div className="rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
                          <p className="font-medium text-slate-800">
                            {review.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {review.schedules?.book_title} ·{" "}
                            {new Date(
                              review.created_at as string
                            ).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      아직 작성한 독후감이 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">내가 올린 토론 발제</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentTopics?.length ? (
                    // TODO: 타입 수정 필요
                    recentTopics.map((topic: any) => (
                      <Link
                        key={topic.id}
                        href={`/topics/${topic.id}`}
                        className="block"
                      >
                        <div className="rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
                          <p className="font-medium text-slate-800">
                            {topic.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {topic.schedules?.book_title} · 댓글{" "}
                            {topic.topic_comments?.[0]?.count ?? 0}개
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      최근 토론 발제가 없습니다.
                    </p>
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
