import { createSupabaseServerClient } from "@supabase/server";
import { ReviewCard } from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import DetailHeader from "@/components/DetailHeader";
import { CohortFilter } from "@/components/CohortFilter";
import { profileImagesByUserId } from "@/lib/profile-image";

// Reviews index page: lists recent reviews.
// Queries: reviews joined with schedules + users for display.
// Access: everyone can read, but new button hidden for pending/unauthed.
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const parsed = cohortParam ? Number(cohortParam) : NaN;
  const cohortValue = Number.isFinite(parsed) ? parsed : null;

  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();

  const { data: cohortRows } = await supabase
    .from("schedules")
    .select("cohort")
    .not("cohort", "is", null)
    .order("cohort");
  const cohorts = [...new Set(cohortRows?.map((r) => r.cohort) ?? [])].filter(
    (c): c is number => c !== null,
  );

  let scheduleIds: string[] | null = null;
  if (cohortValue !== null) {
    const { data: cohortSchedules } = await supabase
      .from("schedules")
      .select("id")
      .eq("cohort", cohortValue);
    scheduleIds = cohortSchedules?.map((s) => s.id) ?? [];
  }

  let reviewsQuery = supabase
    .from("reviews")
    .select(
      "id, title, author_id, schedule:schedules!reviews_schedule_id_fkey(book_title), author:users!reviews_author_id_fkey(nickname), created_at",
    )
    .order("created_at", { ascending: false });

  if (scheduleIds !== null) {
    reviewsQuery = reviewsQuery.in("schedule_id", scheduleIds);
  }

  const { data: reviews } = await reviewsQuery;
  const authorIds = [
    ...new Set(
      (reviews ?? []).map((review) => review.author_id).filter(Boolean),
    ),
  ] as string[];
  const { data: avatarRows } =
    authorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url, profile_decoration")
          .in("user_id", authorIds)
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  return (
    <>
      <DetailHeader title="독후감" />
      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-4">
            {cohorts.length > 0 ? (
              <CohortFilter cohorts={cohorts} selected={cohortValue} />
            ) : null}
            {sessionUser &&
            sessionUser.role !== "pending" &&
            !sessionUser.isDeactivated ? (
              <Link href="/reviews/new">
                <Button>독후감 작성</Button>
              </Link>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {reviews && reviews.length === 0 ? (
            <p className="text-sm text-slate-600">
              아직 작성된 독후감이 없어요.
            </p>
          ) : null}
          {reviews?.map((review) => (
            <ReviewCard
              key={review.id}
              id={review.id}
              title={review.title}
              author={review.author?.nickname ?? "익명"}
              authorImageUrl={
                review.author_id
                  ? profileImageMap.get(review.author_id)?.profileImageUrl
                  : undefined
              }
              authorDecoration={
                review.author_id
                  ? profileImageMap.get(review.author_id)?.profileDecoration
                  : undefined
              }
              scheduleTitle={review.schedule?.book_title ?? "모임"}
              createdAt={review.created_at}
            />
          ))}
        </div>
      </div>
    </>
  );
}
