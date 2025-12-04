import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { ReviewHighlightSidebar } from "@/components/ReviewHighlightSidebar";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";
import { ViewCountPinger } from "./view-count-pinger";
import { ReviewViewer } from "@/components/ReviewViewer";
import DetailHeader from "@/components/DetailHeader";
import { revalidatePath } from "next/cache";
import { ReviewDetailActions } from "@/components/ReviewDetailActions";
import { EmojiReactionBar } from "@/components/EmojiReactionBar";
import { fetchReactionSummary, toggleReaction } from "@/lib/reactions";

// Review detail page showing Tiptap content, highlights, and comments.
// Params: { params: { id: string } }
// Queries: review with author/schedule, highlights, comments
// Access: Everyone can view; interactions limited via API based on role
export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const reviewId = (await params).id;

  const { data: review } = await supabase
    .from("reviews")
    .select(
      "id, title, content_markdown, content_rich, created_at, author_id, author:users!reviews_author_id_fkey(nickname), schedule:schedules!reviews_schedule_id_fkey(book_title)"
    )
    .eq("id", reviewId)
    .single();

  if (!review) notFound();

  const { data: highlights } = await supabase
    .from("review_highlights")
    .select("id, highlight_text, reaction, comment")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false });

  const { data: comments } = await supabase
    .from("review_comments")
    .select(
      "id, body, created_at, author:users!review_comments_author_id_fkey(nickname)"
    )
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false });

  const defaultContent = { type: "doc", content: [{ type: "paragraph" }] };
  const reviewContent =
    typeof review.content_rich === "string"
      ? (() => {
          try {
            return JSON.parse(review.content_rich);
          } catch {
            return defaultContent;
          }
        })()
      : review.content_rich ?? defaultContent;

  const canEdit = !!sessionUser && review.author_id === sessionUser.id;
  const reviewReactions = await fetchReactionSummary(
    supabase,
    "review_reactions",
    "review_id",
    reviewId,
    sessionUser?.id
  );

  async function handleCommentSubmit(body: string) {
    "use server";
    if (!body) throw new Error("댓글 내용을 입력해주세요.");
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    const { error } = await supabase.from("review_comments").insert([
      {
        review_id: reviewId,
        author_id: user.id,
        body,
      },
    ]);
    if (error) {
      throw new Error("댓글 작성 실패: " + error.message);
    }
    revalidatePath(`/reviews/${reviewId}`);
  }

  async function handleUpdateReview(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 멤버만 수정할 수 있습니다.");
    }

    const reviewId = formData.get("reviewId")?.toString();
    const title = formData.get("title")?.toString();
    const contentRich = formData.get("contentRich")?.toString();

    if (!reviewId || !title || !contentRich) {
      throw new Error("필수 값이 누락되었습니다.");
    }

    // Validate contentRich is valid JSON string so stored value stays well-formed.
    try {
      JSON.parse(contentRich);
    } catch {
      throw new Error("본문을 불러오지 못했습니다. 다시 시도해주세요.");
    }

    const { data, error } = await supabase
      .from("reviews")
      .update({
        title,
        content_rich: contentRich,
        content_markdown: null,
      })
      .eq("id", reviewId)
      .eq("author_id", sessionUser.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("독후감 수정 실패: " + error.message);
    }

    if (!data) {
      throw new Error("수정할 독후감을 찾을 수 없습니다.");
    }

    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath("/reviews");
    redirect(`/reviews/${reviewId}`);
  }

  async function handleDeleteReview(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 멤버만 삭제할 수 있습니다.");
    }

    const reviewId = formData.get("reviewId")?.toString();

    if (!reviewId) {
      throw new Error("잘못된 요청입니다.");
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("author_id", sessionUser.id);

    if (error) {
      throw new Error("독후감 삭제 실패: " + error.message);
    }

    revalidatePath("/reviews");
    redirect("/reviews");
  }

  async function handleToggleReviewReaction(emoji: string) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      throw new Error("로그인이 필요합니다.");
    }

    const reviewId = (await params).id;
    await toggleReaction({
      supabase,
      table: "review_reactions",
      contentColumn: "review_id",
      contentId: reviewId,
      userId: sessionUser.id,
      emoji,
    });

    const summary = await fetchReactionSummary(
      supabase,
      "review_reactions",
      "review_id",
      reviewId,
      sessionUser.id
    );

    revalidatePath(`/reviews/${reviewId}`);
    return summary;
  }

  return (
    <>
      <DetailHeader title="독후감 상세" />
      <div className="max-w-3xl mx-auto py-8">
        <article className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-900">
                {review.title}
              </h1>
              <p className="text-sm text-slate-500">
                {review.author?.nickname ?? "익명"} ·{" "}
                {new Date(review.created_at || "").toLocaleDateString("ko-KR")}{" "}
                · {review.schedule?.book_title}
              </p>
            </div>
            {canEdit ? (
              <ReviewDetailActions
                reviewId={review.id}
                initialTitle={review.title}
                initialContent={reviewContent}
                onUpdate={handleUpdateReview}
                onDelete={handleDeleteReview}
              />
            ) : null}
          </header>
          <Card>
            <CardContent className="prose prose-slate max-w-none p-4">
              <ReviewViewer content={reviewContent} />
            </CardContent>
          </Card>
          <EmojiReactionBar
            initialReactions={reviewReactions}
            onToggle={handleToggleReviewReaction}
            disabled={!sessionUser}
            currentUserNickname={sessionUser?.nickname}
          />
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
        </article>
        {/* Client-side component ensures view count increments after hydration */}
        <ViewCountPinger reviewId={review.id} />
        {/* <ReviewHighlightSidebar
        highlights={
          highlights?.map((highlight) => ({
            id: highlight.id,
            text: highlight.highlight_text,
            reactions: highlight.reaction ?? [],
            comment: highlight.comment ?? undefined,
          })) ?? []
        }
      /> */}
      </div>
    </>
  );
}
