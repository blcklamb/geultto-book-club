import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalizedDate } from "@/components/LocalizedDate";
import { UserAvatar } from "@/components/UserAvatar";

export type ReviewCardProps = {
  id: string;
  title: string;
  author: string;
  authorImageUrl?: string | null;
  authorDecoration?: string | null;
  scheduleTitle: string;
  createdAt: string | null | undefined;
  commentCount?: number;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  id,
  title,
  author,
  authorImageUrl,
  authorDecoration,
  scheduleTitle,
  createdAt,
  commentCount,
}) => {
  return (
    <Link
      href={`/reviews/${id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors group-hover:border-input group-hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{scheduleTitle}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserAvatar
              imageUrl={authorImageUrl}
              decoration={authorDecoration}
              size="sm"
            />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <LocalizedDate
              value={createdAt}
              options={{
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }}
            />
            <span
              className="inline-flex items-center gap-1"
              aria-label={`댓글 ${commentCount ?? 0}개`}
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {commentCount ?? 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
