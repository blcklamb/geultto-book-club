import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";
import { ViewCountPinger } from "./view-count-pinger";
import { ReviewViewerInteractive } from "@/components/ReviewViewerInteractive";
import DetailHeader from "@/components/DetailHeader";
import { revalidatePath } from "next/cache";
import { ReviewDetailActions } from "@/components/ReviewDetailActions";
import { EmojiReactionBar } from "@/components/EmojiReactionBar";
import { fetchReactionSummary, toggleReaction, summarizeReactions } from "@/lib/reactions";
import type { HighlightWithComments } from "@/lib/highlight";
import { UserAvatar } from "@/components/UserAvatar";
import { profileImagesByUserId } from "@/lib/profile-image";

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

  const { data: highlightRows } = await supabase
    .from("review_highlights")
    .select(
      `id, author_id, highlight_text, start_pos, end_pos,
       author:users!review_highlights_author_id_fkey(nickname),
       highlight_comments(
         id, body, author_id, created_at,
         author:users!highlight_comments_author_id_fkey(nickname),
         highlight_comment_reactions(emoji, user_id, user:users(nickname)),
         highlight_comment_replies(
           id, body, author_id, created_at,
           author:users!highlight_comment_replies_author_id_fkey(nickname)
         )
       )`
    )
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  const { data: comments } = await supabase
    .from("review_comments")
    .select(
      "id, body, author_id, created_at, author:users!review_comments_author_id_fkey(nickname)"
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
  const authorIds = [
    review.author_id,
    ...(comments ?? []).map((comment) => comment.author_id),
    ...(highlightRows ?? []).map((highlight) => highlight.author_id),
    ...(highlightRows ?? []).flatMap((highlight) =>
      ((highlight.highlight_comments as unknown[]) ?? []).flatMap((item) => {
        const comment = item as {
          author_id?: string | null;
          highlight_comment_replies?: Array<{ author_id?: string | null }>;
        };
        return [
          comment.author_id,
          ...(comment.highlight_comment_replies ?? []).map(
            (reply) => reply.author_id
          ),
        ];
      })
    ),
  ].filter(Boolean) as string[];
  const { data: avatarRows } =
    authorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url")
          .in("user_id", [...new Set(authorIds)])
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  // Transform nested highlight rows into typed HighlightWithComments[].
  // Rows with null positions are skipped — 0 is not a valid ProseMirror position.
  const highlights: HighlightWithComments[] = (highlightRows ?? [])
    .filter((h) => h.start_pos != null && h.end_pos != null)
    .map((h) => ({
      id: h.id,
      authorId: h.author_id ?? "",
      highlightText: h.highlight_text,
      startPos: h.start_pos!,
      endPos: h.end_pos!,
      authorNickname:
        (h.author as { nickname: string } | null)?.nickname ?? "익명",
      authorImageUrl: h.author_id
        ? profileImageMap.get(h.author_id)?.profileImageUrl
        : undefined,
      comments: ((h.highlight_comments as unknown[]) ?? []).map((c: unknown) => {
        const comment = c as {
          id: string;
          body: string;
          author_id: string | null;
          created_at: string | null;
          author: { nickname: string } | null;
          highlight_comment_reactions: Array<{
            emoji: string;
            user_id: string | null;
            user: { nickname: string | null } | Array<{ nickname: string | null }> | null;
          }>;
          highlight_comment_replies: Array<{
            id: string;
            body: string;
            author_id: string | null;
            created_at: string | null;
            author: { nickname: string } | Array<{ nickname: string }> | null;
          }>;
        };
        return {
          id: comment.id,
          body: comment.body,
          author: comment.author?.nickname ?? "익명",
          authorImageUrl: comment.author_id
            ? profileImageMap.get(comment.author_id)?.profileImageUrl
            : undefined,
          createdAt: comment.created_at
            ? new Date(comment.created_at).toLocaleString("ko-KR")
            : "-",
          reactions: summarizeReactions(
            (comment.highlight_comment_reactions ?? []).map((r) => ({
              emoji: r.emoji,
              user_id: r.user_id,
              user: Array.isArray(r.user) ? r.user[0] : r.user,
            })),
            sessionUser?.id
          ),
          replies: (comment.highlight_comment_replies ?? []).map((r) => {
            const author = Array.isArray(r.author) ? r.author[0] : r.author;
            return {
              id: r.id,
              body: r.body,
              author: author?.nickname ?? "익명",
              authorImageUrl: r.author_id
                ? profileImageMap.get(r.author_id)?.profileImageUrl
                : undefined,
              createdAt: r.created_at
                ? new Date(r.created_at).toLocaleString("ko-KR")
                : "-",
            };
          }),
        };
      }),
    }));
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
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <UserAvatar
                  imageUrl={
                    review.author_id
                      ? profileImageMap.get(review.author_id)?.profileImageUrl
                      : undefined
                  }
                  size="sm"
                />
                <span>
                  {review.author?.nickname ?? "익명"} ·{" "}
                  {new Date(review.created_at || "").toLocaleDateString("ko-KR")}{" "}
                  · {review.schedule?.book_title}
                </span>
              </div>
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
              <ReviewViewerInteractive
                content={reviewContent}
                reviewId={review.id}
                initialHighlights={highlights}
                disabled={!sessionUser || sessionUser.role === "pending"}
                currentUserNickname={sessionUser?.nickname}
                currentUserId={sessionUser?.id}
              />
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
                authorImageUrl: comment.author_id
                  ? profileImageMap.get(comment.author_id)?.profileImageUrl
                  : undefined,
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
      </div>
    </>
  );
}
