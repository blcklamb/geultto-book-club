import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewViewer } from "@/components/ReviewViewer";
import { TopicDetailActions } from "@/components/TopicDetailActions";
import DetailHeader from "@/components/DetailHeader";

// Topic detail page: renders tiptap content and comment thread.
export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const topicId = (await params).id;

  const { data: topic } = await supabase
    .from("topics")
    .select(
      "id, title, body_markdown, body_rich, created_at, author_id, author:users!topics_author_id_fkey(nickname), schedule:schedules!topics_schedule_id_fkey(book_title)"
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

  const defaultContent = { type: "doc", content: [{ type: "paragraph" }] };
  const topicContent =
    typeof topic.body_rich === "string"
      ? (() => {
          try {
            return JSON.parse(topic.body_rich);
          } catch {
            return defaultContent;
          }
        })()
      : topic.body_rich ?? defaultContent;

  const canEdit = !!sessionUser && topic.author_id === sessionUser.id;

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

  async function handleUpdateTopic(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 멤버만 수정할 수 있습니다.");
    }

    const topicId = formData.get("topicId")?.toString();
    const title = formData.get("title")?.toString();
    const bodyRich = formData.get("bodyRich")?.toString();

    if (!topicId || !title || !bodyRich) {
      throw new Error("필수 값이 누락되었습니다.");
    }

    const { data, error } = await supabase
      .from("topics")
      .update({
        title,
        body_rich: JSON.parse(bodyRich),
        body_markdown: null,
      })
      .eq("id", topicId)
      .eq("author_id", sessionUser.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("발제 수정 실패: " + error.message);
    }

    if (!data) {
      throw new Error("수정할 발제를 찾을 수 없습니다.");
    }

    revalidatePath(`/topics/${topicId}`);
    revalidatePath("/topics");
    redirect(`/topics/${topicId}`);
  }

  async function handleDeleteTopic(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 멤버만 삭제할 수 있습니다.");
    }

    const topicId = formData.get("topicId")?.toString();

    if (!topicId) {
      throw new Error("잘못된 요청입니다.");
    }

    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", topicId)
      .eq("author_id", sessionUser.id);

    if (error) {
      throw new Error("발제 삭제 실패: " + error.message);
    }

    revalidatePath("/topics");
    redirect("/topics");
  }

  return (
    <>
      <DetailHeader title="토론 발제 상세" />
      <div className="space-y-6 p-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">
              {topic.title}
            </h1>
            <p className="text-sm text-slate-500">
              {topic.author?.nickname ?? "익명"} · {topic.schedule?.book_title}
            </p>
          </div>
          {canEdit ? (
            <TopicDetailActions
              topicId={topic.id}
              initialTitle={topic.title}
              initialContent={topicContent}
              onUpdate={handleUpdateTopic}
              onDelete={handleDeleteTopic}
            />
          ) : null}
        </header>
        <Card>
          <CardContent className="prose prose-slate max-w-none p-4">
            <ReviewViewer content={topicContent} />
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
