import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@supabase/server";
import DetailHeader from "@/components/DetailHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { QuoteDetailActions } from "@/components/QuoteDetailActions";
import { QuoteImageExporter } from "@/components/QuoteImageExporter";
import { EmojiReactionBar } from "@/components/EmojiReactionBar";
import { fetchReactionSummary, toggleReaction } from "@/lib/reactions";

// Quote detail page: shows a single quote with related schedule context.
export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSessionUser();
  const quoteId = (await params).id;
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, text, page_number, created_at, schedule_id, author_id, schedule:schedules!quotes_schedule_id_fkey(book_title), author:users!quotes_author_id_fkey(nickname)"
    )
    .eq("id", quoteId)
    .single();

  if (!quote) notFound();

  const canEdit = !!sessionUser && quote.author_id === sessionUser.id;
  const quoteReactions = await fetchReactionSummary(
    supabase,
    "quote_reactions",
    "quote_id",
    quoteId,
    sessionUser?.id
  );

  async function handleUpdateQuote(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 멤버만 수정할 수 있습니다.");
    }

    const quoteId = formData.get("quoteId")?.toString();
    const text = formData.get("text")?.toString();
    const pageNumber = formData.get("pageNumber")?.toString() ?? null;

    if (!quoteId || !text) {
      throw new Error("필수 값이 누락되었습니다.");
    }

    const { error } = await supabase
      .from("quotes")
      .update({
        text,
        page_number: pageNumber || null,
      })
      .eq("id", quoteId)
      .eq("author_id", sessionUser.id);

    if (error) {
      throw new Error("구절 수정 실패: " + error.message);
    }

    revalidatePath(`/quotes/${quoteId}`);
  }

  async function handleDeleteQuote(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role === "pending") {
      throw new Error("승인된 멤버만 삭제할 수 있습니다.");
    }

    const quoteId = formData.get("quoteId")?.toString();

    if (!quoteId) {
      throw new Error("잘못된 요청입니다.");
    }

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId)
      .eq("author_id", sessionUser.id);

    if (error) {
      throw new Error("구절 삭제 실패: " + error.message);
    }

    revalidatePath("/quotes");
    redirect("/quotes");
  }

  async function handleToggleQuoteReaction(emoji: string) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      throw new Error("로그인 후 반응을 남길 수 있습니다.");
    }

    const quoteId = (await params).id;
    await toggleReaction({
      supabase,
      table: "quote_reactions",
      contentColumn: "quote_id",
      contentId: quoteId,
      userId: sessionUser.id,
      emoji,
    });

    const summary = await fetchReactionSummary(
      supabase,
      "quote_reactions",
      "quote_id",
      quoteId,
      sessionUser.id
    );

    revalidatePath(`/quotes/${quoteId}`);
    return summary;
  }

  return (
    <>
      <DetailHeader title="인상 깊은 구절" />
      <div className="space-y-6 p-8 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-xl font-semibold text-slate-900">
              {quote.schedule?.book_title ?? "모임"}
            </CardTitle>
            {canEdit ? (
              <QuoteDetailActions
                quoteId={quote.id}
                initialText={quote.text}
                initialPageNumber={quote.page_number ?? ""}
                onUpdate={handleUpdateQuote}
                onDelete={handleDeleteQuote}
              />
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p className="text-sm text-slate-500">
              p.{quote.page_number ?? "-"}
            </p>
            <p className="text-lg leading-relaxed italic">“{quote.text}”</p>
            <p className="text-sm text-slate-500">
              by {quote.author?.nickname ?? "익명"}
            </p>
            <div className="flex flex-row items-center gap-4 text-xs text-slate-400">
              {quote.schedule_id ? (
                <Link
                  href={`/schedule/${quote.schedule_id}`}
                  className="text-sm text-indigo-600 underline underline-offset-4 hover:text-indigo-700"
                >
                  관련 모임 상세 보기
                </Link>
              ) : null}
              <QuoteImageExporter
                quoteText={quote.text}
                bookTitle={quote.schedule?.book_title}
                pageNumber={quote.page_number}
                author={quote.author?.nickname}
              />
            </div>
            <EmojiReactionBar
              initialReactions={quoteReactions}
              onToggle={handleToggleQuoteReaction}
              disabled={!sessionUser}
              currentUserNickname={sessionUser?.nickname}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
