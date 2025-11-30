import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";

// Topic detail page: renders tiptap content and comment thread.
export default async function TopicDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const { data: topic } = await supabase
    .from("topics")
    .select(
      "id, title, body_markdown, body_rich, created_at, author:users!topics_author_id_fkey(nickname), schedule:schedules!topics_schedule_id_fkey(book_title)"
    )
    .eq("id", params.id)
    .single();

  if (!topic) notFound();

  const { data: comments } = await supabase
    .from("topic_comments")
    .select(
      "id, body, created_at, author:users!topic_comments_author_id_fkey(nickname)"
    )
    .eq("topic_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{topic.title}</h1>
        <p className="text-sm text-slate-500">
          {topic.author?.nickname ?? "익명"} · {topic.schedule?.book_title}
        </p>
      </header>
      <Card>
        <CardContent className="prose prose-slate max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-slate-700">
            {topic.body_markdown ?? JSON.stringify(topic.body_rich, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <CommentThread
        comments={
          comments?.map((comment) => ({
            id: comment.id,
            body: comment.body,
            author: comment.author?.nickname ?? "익명",
            createdAt: new Date(comment.created_at).toLocaleString("ko-KR"),
          })) ?? []
        }
        disabled={!sessionUser || sessionUser.role === "pending"}
      />
    </div>
  );
}
