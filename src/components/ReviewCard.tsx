import Link from "next/link";
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
    <Link href={`/reviews/${id}`}>
      <Card className="transition hover:-translate-y-1 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <p className="text-sm text-slate-500">{scheduleTitle}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserAvatar
              imageUrl={authorImageUrl}
              decoration={authorDecoration}
              size="sm"
            />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
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
            <span>💬 {commentCount ?? 0}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
