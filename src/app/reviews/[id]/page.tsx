import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { ReviewHighlightSidebar } from "@/components/ReviewHighlightSidebar";
import { CommentThread } from "@/components/CommentThread";
import { Card, CardContent } from "@/components/ui/card";
import { ViewCountPinger } from "./view-count-pinger";

// Review detail page showing Tiptap content, highlights, and comments.
// Params: { params: { id: string } }
// Queries: review with author/schedule, highlights, comments
// Access: Everyone can view; interactions limited via API based on role
export default async function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  const { data: review } = await supabase
    .from("reviews")
    .select(
      "id, title, content_markdown, content_rich, created_at, author:users!reviews_author_id_fkey(nickname), schedule:schedules!reviews_schedule_id_fkey(book_title)"
    )
    .eq("id", params.id)
    .single();

  if (!review) notFound();

  const { data: highlights } = await supabase
    .from("review_highlights")
    .select("id, highlight_text, reaction, comment")
    .eq("review_id", params.id)
    .order("created_at", { ascending: false });

  const { data: comments } = await supabase
    .from("review_comments")
    .select(
      "id, body, created_at, author:users!review_comments_author_id_fkey(nickname)"
    )
    .eq("review_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">
            {review.title}
          </h1>
          <p className="text-sm text-slate-500">
            {review.author?.nickname ?? "익명"} ·{" "}
            {new Date(review.created_at).toLocaleDateString("ko-KR")} ·{" "}
            {review.schedule?.book_title}
          </p>
        </header>
        <Card>
          <CardContent className="prose prose-slate max-w-none">
            {/* 실제 UI에서는 Tiptap JSON을 전용 renderer로 변환 */}
            <pre className="whitespace-pre-wrap text-sm text-slate-700">
              {review.content_markdown ??
                JSON.stringify(review.content_rich, null, 2)}
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
      </article>
      {/* Client-side component ensures view count increments after hydration */}
      <ViewCountPinger reviewId={review.id} />
      <ReviewHighlightSidebar
        highlights={
          highlights?.map((highlight) => ({
            id: highlight.id,
            text: highlight.highlight_text,
            reactions: highlight.reaction ?? [],
            comment: highlight.comment ?? undefined,
          })) ?? []
        }
      />
    </div>
  );
}
