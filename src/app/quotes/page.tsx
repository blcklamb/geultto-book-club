import { createSupabaseServerClient } from "@/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { QuotesClient } from "./QuotesClient";

export default async function QuotesPage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, text, page_number, schedules(book_title), users(nickname)")
    .order("created_at", { ascending: false });

  return (
    <QuotesClient
      quotes={
        quotes?.map((quote) => ({
          id: quote.id,
          text: quote.text,
          page: quote.page_number ?? "-",
          scheduleTitle: quote.schedules[0]?.book_title ?? "모임",
          author: quote.users[0]?.nickname ?? "익명",
        })) ?? []
      }
      canCreate={!!sessionUser && sessionUser.role !== "pending"}
    />
  );
}
