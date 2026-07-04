import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PALETTE_SUMMARY_TIME_ZONE = "Asia/Seoul";

type SummerPaletteViewerCardProps = {
  updatedAt?: string | null;
};

export function SummerPaletteViewerCard({
  updatedAt,
}: SummerPaletteViewerCardProps) {
  const hasSavedBoard = Boolean(updatedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span>나의 여름 팔레트</span>
          <Badge variant={hasSavedBoard ? "secondary" : "outline"}>
            {hasSavedBoard ? "저장됨" : "미시작"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium text-slate-900">
          {hasSavedBoard ? "저장한 팔레트가 있습니다" : "아직 저장한 팔레트가 없습니다"}
        </p>
        <p className="text-xs text-slate-500">
          {formatUpdatedAt(updatedAt)}
        </p>

        <Button asChild variant="outline" className="w-full">
          <Link href="/summer-palette">
            {hasSavedBoard ? "팔레트 보러가기" : "팔레트 시작하기"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return "아직 저장된 기록 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "저장 시각을 확인할 수 없음";
  }

  return `${formatPaletteSummaryTimestamp(date)} 저장`;
}

function formatPaletteSummaryTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: PALETTE_SUMMARY_TIME_ZONE,
  }).formatToParts(date);

  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${byType.month}.${byType.day} ${byType.hour}:${byType.minute}`;
}
