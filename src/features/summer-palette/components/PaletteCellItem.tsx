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
        "group relative z-10 aspect-square overflow-hidden border bg-white text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
        filled
          ? "border-orange-200"
          : "border-slate-200 hover:border-orange-300 hover:bg-orange-50",
        // 완성된 라인(가로/세로/대각)에 속한 칸을 시각적으로 강조한다. (FR-8)
        isHighlighted &&
          "z-20 border-emerald-400 ring-2 ring-inset ring-emerald-400",
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

      {cell.photo ? (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/20 to-transparent" />
      ) : null}

      {timestamp ? (
        <span className="absolute left-2 top-2 rounded-full border border-orange-300/80 bg-white/90 px-2 py-0.5 text-[10px] font-bold leading-none text-slate-900 shadow-sm sm:text-xs">
          {timestamp}
        </span>
      ) : null}

      <div
        className={cn(
          "absolute left-3 h-1.5 w-10 rounded-full bg-current opacity-80",
          timestamp ? "top-9 sm:top-10" : "top-3",
        )}
        style={{ color: accent }}
      />

      {filled ? (
        <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <Check className="h-4 w-4" />
          <span className="sr-only">완료</span>
        </span>
      ) : (
        <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm">
          <ImagePlus className="h-4 w-4" />
          <span className="sr-only">사진 추가</span>
        </span>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-3",
          filled ? "text-white" : "text-slate-900",
        )}
      >
        <p className="text-xs font-bold leading-snug sm:text-sm">
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
