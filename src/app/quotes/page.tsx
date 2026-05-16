import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { QuotesClient } from "./QuotesClient";
import { profileImagesByUserId } from "@/lib/profile-image";

export default async function QuotesPage({
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
  const cohorts = [
    ...new Set(cohortRows?.map((r) => r.cohort) ?? []),
  ].filter((c): c is number => c !== null);

  let scheduleIds: string[] | null = null;
  if (cohortValue !== null) {
    const { data: cohortSchedules } = await supabase
      .from("schedules")
      .select("id")
      .eq("cohort", cohortValue);
    scheduleIds = cohortSchedules?.map((s) => s.id) ?? [];
  }

  let quotesQuery = supabase
    .from("quotes")
    .select(
      "id, text, page_number, author_id, schedule:schedules!quotes_schedule_id_fkey(book_title), author:users!quotes_author_id_fkey(nickname)"
    )
    .order("created_at", { ascending: false });

  if (scheduleIds !== null) {
    quotesQuery = quotesQuery.in("schedule_id", scheduleIds);
  }

  const { data: quotes } = await quotesQuery;
  const authorIds = [
    ...new Set((quotes ?? []).map((quote) => quote.author_id).filter(Boolean)),
  ] as string[];
  const { data: avatarRows } =
    authorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url, profile_decoration")
          .in("user_id", authorIds)
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, book_title")
    .order("date", { ascending: false });

  return (
    <QuotesClient
      quotes={
        quotes?.map((quote) => ({
          id: quote.id,
          text: quote.text,
          page: quote.page_number ?? "-",
          scheduleTitle: quote.schedule?.book_title ?? "모임",
          author: quote.author?.nickname ?? "익명",
          authorImageUrl: quote.author_id
            ? profileImageMap.get(quote.author_id)?.profileImageUrl
            : undefined,
          authorDecoration: quote.author_id
            ? profileImageMap.get(quote.author_id)?.profileDecoration
            : undefined,
        })) ?? []
      }
      schedules={
        schedules?.map((schedule) => ({
          id: schedule.id,
          title: schedule.book_title,
        })) ?? []
      }
      canCreate={
        !!sessionUser && sessionUser.role !== "pending" && !sessionUser.isDeactivated
      }
      cohorts={cohorts}
      selectedCohort={cohortValue}
    />
  );
}
