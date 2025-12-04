import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const QuoteCard: React.FC<{
  quote: {
    id: string;
    scheduleTitle: string;
    page: string;
    text: string;
    author: string;
  };
}> = ({ quote }) => {
  return (
    <Link href={`/quotes/${quote.id}`} className="block h-full">
      <Card className="h-full transition hover:-translate-y-1 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">{quote.scheduleTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-slate-500">p.{quote.page}</p>
          <p className="text-slate-700 line-clamp-6 italic">“{quote.text}”</p>
          <p className="text-xs text-slate-400">by {quote.author}</p>
        </CardContent>
      </Card>
    </Link>
  );
};
