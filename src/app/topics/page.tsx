import Link from "next/link";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Topics index page listing discussion prompts.
export default async function TopicsPage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const { data: topics } = await supabase
    .from("topics")
    .select(
      "id, title, created_at, schedule:schedules!topics_schedule_id_fkey(book_title), author:users!topics_author_id_fkey(nickname), topic_comments(count)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">토론 발제</h1>
          <p className="text-sm text-slate-500">토론 주제를 공유해요.</p>
        </div>
        {sessionUser && sessionUser.role !== "pending" ? (
          <Link href="/topics/new">
            <Button>발제 등록</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {topics?.map((topic) => (
          <Link key={topic.id} href={`/topics/${topic.id}`}>
            <Card className="transition hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <p>{topic.schedule?.book_title}</p>
                <p className="text-xs text-slate-400">
                  {topic.author?.nickname ?? "익명"} ·{" "}
                  {new Date(topic.created_at || "").toLocaleDateString("ko-KR")}{" "}
                  · 댓글 {topic.topic_comments?.[0]?.count ?? 0}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
