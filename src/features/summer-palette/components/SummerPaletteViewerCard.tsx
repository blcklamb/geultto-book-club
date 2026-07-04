import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SUMMER_PALETTE_CELL_ACCENTS } from "../data/themes";
import {
  getFilledCount,
  getHighlightedCellIndexes,
  isCellFilled,
  isFullClear,
} from "../lib/paletteLogic";
import { formatPaletteTimestamp } from "../hooks/useImageResize";
import type { PaletteBoard, PaletteCell } from "../types";

type SummerPaletteViewerCardProps = {
  board: PaletteBoard;
  updatedAt?: string | null;
};

export function SummerPaletteViewerCard({
  board,
  updatedAt,
}: SummerPaletteViewerCardProps) {
  const filledCount = getFilledCount(board);
  const fullClear = isFullClear(board);
  const highlightedCellIndexes = new Set<number>(getHighlightedCellIndexes(board));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span>나의 여름 팔레트</span>
          <Badge variant={fullClear ? "default" : "secondary"}>
            {fullClear ? "완성" : `${filledCount}/9`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-lg bg-orange-100 shadow-sm ring-1 ring-orange-200">
          <div className="grid aspect-square grid-cols-3 gap-0">
            {board.cells.map((cell) => (
              <SummerPaletteViewerCell
                key={cell.id}
                cell={cell}
                isHighlighted={highlightedCellIndexes.has(cell.index)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">
            {filledCount}/9칸 완료
          </p>
          <p className="text-xs text-slate-500">
            {formatUpdatedAt(updatedAt)}
          </p>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href="/summer-palette">
            {filledCount > 0 ? "팔레트 보러가기" : "팔레트 시작하기"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SummerPaletteViewerCell({
  cell,
  isHighlighted,
}: {
  cell: PaletteCell;
  isHighlighted: boolean;
}) {
  const filled = isCellFilled(cell);
  const accent = SUMMER_PALETTE_CELL_ACCENTS[cell.index] ?? "#f97316";
  const timestamp = formatCellTimestamp(cell);

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden border bg-white text-left",
        filled ? "border-orange-200" : "border-slate-200",
        isHighlighted && "z-10 border-emerald-400 ring-2 ring-inset ring-emerald-400",
      )}
      data-line-completed={isHighlighted ? "true" : undefined}
    >
      {cell.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cell.photo.dataUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `${accent}18` }}
        />
      )}

      {cell.photo ? (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/20 to-transparent" />
      ) : null}

      {timestamp ? (
        <span className="absolute left-1.5 top-1.5 rounded-full border border-orange-300/80 bg-white/90 px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-900 shadow-sm">
          {timestamp}
        </span>
      ) : null}

      {filled ? (
        <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <Check className="h-3.5 w-3.5" />
          <span className="sr-only">완료</span>
        </span>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-2",
          filled ? "text-white" : "text-slate-900",
        )}
      >
        <p className="line-clamp-2 text-[10px] font-bold leading-tight">
          {cell.title}
        </p>
      </div>
    </div>
  );
}

function formatCellTimestamp(cell: PaletteCell) {
  if (!cell.completedAt) {
    return null;
  }

  const date = new Date(cell.completedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatPaletteTimestamp(date);
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return "아직 저장된 기록 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "저장 시각을 확인할 수 없음";
  }

  return `${formatPaletteTimestamp(date)} 저장`;
}
