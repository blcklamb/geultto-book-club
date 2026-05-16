import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewViewer } from "@/components/ReviewViewer";
import { TopicDetailActions } from "@/components/TopicDetailActions";
import DetailHeader from "@/components/DetailHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { profileImagesByUserId } from "@/lib/profile-image";
import { deletePointTransactionsForSource } from "@/lib/points";
import type { Json } from "@supabase/types";

function redirectTopicWithMessage(
  topicId: string,
  type: "error" | "success",
  message: string
): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/topics/${topicId}?${params.toString()}`);
}

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
      "id, body, author_id, created_at, author:users!topic_comments_author_id_fkey(nickname)"
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

  const canEdit =
    !!sessionUser && !sessionUser.isDeactivated && topic.author_id === sessionUser.id;
  const authorIds = [
    topic.author_id,
    ...(comments ?? []).map((comment) => comment.author_id),
  ].filter(Boolean) as string[];
  const { data: avatarRows } =
    authorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url, profile_decoration")
          .in("user_id", [...new Set(authorIds)])
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  async function handleCommentSubmit(body: string) {
    "use server";
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
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

    if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
      redirectTopicWithMessage(topicId, "error", "승인된 멤버만 수정할 수 있습니다.");
    }

    const submittedTopicId = formData.get("topicId")?.toString();
    const title = formData.get("title")?.toString();
    const bodyRich = formData.get("bodyRich")?.toString();

    if (!submittedTopicId || !title || !bodyRich) {
      redirectTopicWithMessage((await params).id, "error", "필수 값이 누락되었습니다.");
    }

    let parsedBodyRich: Json;
    try {
      parsedBodyRich = JSON.parse(bodyRich);
    } catch {
      redirectTopicWithMessage(
        submittedTopicId,
        "error",
        "본문을 불러오지 못했습니다. 다시 시도해주세요."
      );
    }

    const { data, error } = await supabase
      .from("topics")
      .update({
        title,
        body_rich: parsedBodyRich,
        body_markdown: null,
      })
      .eq("id", submittedTopicId)
      .eq("author_id", sessionUser.id)
      .select("id")
      .maybeSingle();

    if (error) {
      redirectTopicWithMessage(submittedTopicId, "error", "발제 수정 실패: " + error.message);
    }

    if (!data) {
      redirectTopicWithMessage(submittedTopicId, "error", "수정할 발제를 찾을 수 없습니다.");
    }

    revalidatePath(`/topics/${submittedTopicId}`);
    revalidatePath("/topics");
    redirectTopicWithMessage(submittedTopicId, "success", "발제가 수정되었습니다.");
  }

  async function handleDeleteTopic(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
      redirectTopicWithMessage((await params).id, "error", "승인된 멤버만 삭제할 수 있습니다.");
    }

    const submittedTopicId = formData.get("topicId")?.toString();

    if (!submittedTopicId) {
      redirectTopicWithMessage((await params).id, "error", "잘못된 요청입니다.");
    }

    await deletePointTransactionsForSource(
      supabase,
      "topic_submission",
      submittedTopicId
    );

    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", submittedTopicId)
      .eq("author_id", sessionUser.id);

    if (error) {
      redirectTopicWithMessage(submittedTopicId, "error", "발제 삭제 실패: " + error.message);
    }

    revalidatePath("/topics");
    const urlParams = new URLSearchParams({
      success: "발제가 삭제되었습니다.",
    });
    redirect(`/topics?${urlParams.toString()}`);
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
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <UserAvatar
                imageUrl={
                  topic.author_id
                    ? profileImageMap.get(topic.author_id)?.profileImageUrl
                    : undefined
                }
                decoration={
                  topic.author_id
                    ? profileImageMap.get(topic.author_id)?.profileDecoration
                    : undefined
                }
                size="sm"
              />
              <span>
                {topic.author?.nickname ?? "익명"} · {topic.schedule?.book_title}
              </span>
            </div>
          </div>
          {canEdit ? (
            <TopicDetailActions
              topicId={topic.id}
              initialTitle={topic.title}
              initialContent={topicContent}
              updateAction={handleUpdateTopic}
              deleteAction={handleDeleteTopic}
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
              authorImageUrl: comment.author_id
                ? profileImageMap.get(comment.author_id)?.profileImageUrl
                : undefined,
              authorDecoration: comment.author_id
                ? profileImageMap.get(comment.author_id)?.profileDecoration
                : undefined,
                createdAt: comment.created_at,
            })) ?? []
          }
          disabled={
            !sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated
          }
          submitAction={handleCommentSubmit}
        />
      </div>
    </>
  );
}
