import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";

export type ReviewCardProps = {
  id: string;
  title: string;
  author: string;
  authorImageUrl?: string | null;
  authorDecoration?: string | null;
  scheduleTitle: string;
  createdAt: string;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  id,
  title,
  author,
  authorImageUrl,
  authorDecoration,
  scheduleTitle,
  createdAt,
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
          <p className="text-xs text-slate-400">{createdAt}</p>
        </CardContent>
      </Card>
    </Link>
  );
};
