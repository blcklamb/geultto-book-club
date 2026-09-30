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
    <Link
      href={`/quotes/${quote.id}`}
      className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors group-hover:border-input group-hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">{quote.scheduleTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">p.{quote.page}</p>
          <p className="line-clamp-6 text-foreground">“{quote.text}”</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
