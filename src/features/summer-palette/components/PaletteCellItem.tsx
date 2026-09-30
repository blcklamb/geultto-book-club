"use client";

import { Check, ImagePlus } from "lucide-react";
import { SUMMER_PALETTE_CELL_ACCENTS } from "../data/themes";
import { isCellFilled } from "../lib/paletteLogic";
import { formatPaletteTimestamp } from "../hooks/useImageResize";
import type { PaletteCell } from "../types";
import { cn } from "@/lib/utils";

type PaletteCellItemProps = {
  cell: PaletteCell;
  isHighlighted?: boolean;
  onSelect: (cell: PaletteCell) => void;
};

export function PaletteCellItem({
  cell,
  isHighlighted = false,
  onSelect,
}: PaletteCellItemProps) {
  const filled = isCellFilled(cell);
  const accent = SUMMER_PALETTE_CELL_ACCENTS[cell.index] ?? "#f97316";
  const timestamp = formatCellTimestamp(cell);

  return (
    <button
      type="button"
      onClick={() => onSelect(cell)}
      className={cn(
        "group relative z-10 aspect-square overflow-hidden border border-border bg-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:opacity-90",
        !filled && "hover:bg-muted",
        // 완성된 라인(가로/세로/대각)에 속한 칸을 시각적으로 강조한다. (FR-8)
        isHighlighted && "z-20 border-success ring-2 ring-inset ring-success",
      )}
      aria-label={`${cell.title} 칸 편집`}
      data-line-completed={isHighlighted ? "true" : undefined}
    >
      {cell.photo ? (
        <img
          src={cell.photo.dataUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `${accent}18` }}
        />
      )}

      {timestamp ? (
        <span className="absolute left-2 top-2 rounded-sm border border-border bg-card px-2 py-1 text-xs font-semibold leading-none text-foreground">
          {timestamp}
        </span>
      ) : null}

      <div
        className={cn(
          "absolute left-3 h-1 w-8 rounded-sm bg-current",
          timestamp ? "top-9 sm:top-10" : "top-3",
        )}
        style={{ color: accent }}
      />

      {filled ? (
        <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-4 w-4" />
          <span className="sr-only">완료</span>
        </span>
      ) : (
        <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
          <span className="sr-only">사진 추가</span>
        </span>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-3",
          cell.photo
            ? "bg-foreground/60 text-primary-foreground"
            : "text-foreground",
        )}
      >
        <p className="text-xs font-semibold leading-snug sm:text-sm">
          {cell.title}
        </p>
      </div>
    </button>
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
