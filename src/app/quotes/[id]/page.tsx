import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";
import DetailHeader from "@/components/DetailHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Quote detail page: shows a single quote with related schedule context.
export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const quoteId = (await params).id;
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, text, page_number, created_at, schedule_id, schedule:schedules!quotes_schedule_id_fkey(book_title), author:users!quotes_author_id_fkey(nickname)"
    )
    .eq("id", quoteId)
    .single();

  if (!quote) notFound();

  return (
    <>
      <DetailHeader title="인상 깊은 구절" />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">
              {quote.schedule?.book_title ?? "모임"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p className="text-sm text-slate-500">
              p.{quote.page_number ?? "-"}
            </p>
            <p className="text-lg leading-relaxed">“{quote.text}”</p>
            <p className="text-sm text-slate-500">
              by {quote.author?.nickname ?? "익명"}
            </p>
            {quote.schedule_id ? (
              <Link
                href={`/schedule/${quote.schedule_id}`}
                className="text-sm text-indigo-600 underline underline-offset-4 hover:text-indigo-700"
              >
                관련 모임 상세 보기
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
