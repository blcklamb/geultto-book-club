import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";

export const QuoteCard: React.FC<{
  quote: {
    id: string;
    scheduleTitle: string;
    page: string;
    text: string;
    author: string;
    authorImageUrl?: string | null;
    authorDecoration?: string | null;
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
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <UserAvatar
              imageUrl={quote.authorImageUrl}
              decoration={quote.authorDecoration}
              size="sm"
            />
            <span>by {quote.author}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
