import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ReviewCardProps = {
  id: string;
  title: string;
  author: string;
  scheduleTitle: string;
  createdAt: string;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  id,
  title,
  author,
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
          <p className="text-sm text-slate-600">{author}</p>
          <p className="text-xs text-slate-400">{createdAt}</p>
        </CardContent>
      </Card>
    </Link>
  );
};
