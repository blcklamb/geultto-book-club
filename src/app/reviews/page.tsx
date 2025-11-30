import { createSupabaseServerClient } from "@supabase/server";
import { ReviewCard } from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

// Reviews index page: lists recent reviews.
// Queries: reviews joined with schedules + users for display.
// Access: everyone can read, but new button hidden for pending/unauthed.
export default async function ReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, title, schedule:schedules!reviews_schedule_id_fkey(book_title), author:users!reviews_author_id_fkey(nickname), created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">독후감</h1>
          <p className="text-sm text-slate-500">
            모임에서 느낀 생각을 함께 나눠요.
          </p>
        </div>
        {sessionUser && sessionUser.role !== "pending" ? (
          <Link href="/reviews/new">
            <Button>독후감 작성</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {reviews?.map((review) => (
          <ReviewCard
            key={review.id}
            id={review.id}
            title={review.title}
            author={review.author?.nickname ?? "익명"}
            scheduleTitle={review.schedule?.book_title ?? "모임"}
            createdAt={new Date(review.created_at).toLocaleDateString("ko-KR")}
          />
        ))}
      </div>
    </div>
  );
}
