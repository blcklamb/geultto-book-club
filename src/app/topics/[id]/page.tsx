import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewViewer } from "@/components/ReviewViewer";

// Topic detail page: renders tiptap content and comment thread.
export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const topicId = (await params).id;

  const { data: topic, error } = await supabase
    .from("topics")
    .select(
      "id, title, body_markdown, body_rich, created_at, author:users!topics_author_id_fkey(nickname), schedule:schedules!topics_schedule_id_fkey(book_title)"
    )
    .eq("id", topicId)
    .single();

  if (!topic) notFound();

  const { data: comments } = await supabase
    .from("topic_comments")
    .select(
      "id, body, created_at, author:users!topic_comments_author_id_fkey(nickname)"
    )
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  async function handleCommentSubmit(body: string) {
    "use server";
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 회원만 댓글을 작성할 수 있습니다.");
    }
    if (!body.trim()) {
      throw new Error("댓글 내용을 입력해주세요.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("topic_comments").insert([
      {
        topic_id: topicId,
        author_id: sessionUser.id,
        body,
      },
    ]);

    if (error) {
      throw new Error("댓글 작성 실패: " + error.message);
    }
    revalidatePath(`/topics/${topicId}`);
  }

  return (
    <>
      <div className="space-y-6 p-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">
            {topic.title}
          </h1>
          <p className="text-sm text-slate-500">
            {topic.author?.nickname ?? "익명"} · {topic.schedule?.book_title}
          </p>
        </header>
        <Card>
          <CardContent className="prose prose-slate max-w-none p-4">
            <ReviewViewer
              content={
                typeof topic.body_rich === "string"
                  ? JSON.parse(topic.body_rich || "{}")
                  : topic.body_rich ?? {
                      type: "doc",
                      content: [{ type: "paragraph" }],
                    }
              }
            />
          </CardContent>
        </Card>
        <CommentThread
          comments={
            comments?.map((comment) => ({
              id: comment.id,
              body: comment.body,
              author: comment.author?.nickname ?? "익명",
              createdAt: new Date(comment.created_at || "").toLocaleString(
                "ko-KR"
              ),
            })) ?? []
          }
          disabled={!sessionUser || sessionUser.role === "pending"}
          onSubmit={handleCommentSubmit}
        />
      </div>
    </>
  );
}
