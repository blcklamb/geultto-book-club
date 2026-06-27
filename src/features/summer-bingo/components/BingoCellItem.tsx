"use client";

import { Check, ImagePlus } from "lucide-react";
import { SUMMER_BINGO_CELL_ACCENTS } from "../data/themes";
import { isCellFilled } from "../lib/bingoLogic";
import type { BingoCell } from "../types";
import { cn } from "@/lib/utils";

type BingoCellItemProps = {
  cell: BingoCell;
  onSelect: (cell: BingoCell) => void;
};

export function BingoCellItem({
  cell,
  onSelect,
}: BingoCellItemProps) {
  const filled = isCellFilled(cell);
  const accent = SUMMER_BINGO_CELL_ACCENTS[cell.index] ?? "#f97316";

  return (
    <button
      type="button"
      onClick={() => onSelect(cell)}
      className={cn(
        "group relative z-10 aspect-square overflow-hidden border bg-white text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
        filled
          ? "border-orange-200"
          : "border-slate-200 hover:border-orange-300 hover:bg-orange-50",
      )}
      aria-label={`${cell.title} 칸 편집`}
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

      <div className="absolute left-3 top-3 h-1.5 w-10 rounded-full bg-current opacity-80" style={{ color: accent }} />

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
