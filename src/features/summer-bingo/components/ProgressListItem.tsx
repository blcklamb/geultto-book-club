"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { isCellFilled } from "../lib/bingoLogic";
import type { BingoCell } from "../types";

type ProgressListItemProps = {
  cell: BingoCell;
};

export function ProgressListItem({ cell }: ProgressListItemProps) {
  const filled = isCellFilled(cell);

  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm">
      {filled ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-slate-300" />
      )}
      <span className={filled ? "font-medium text-slate-900" : "text-slate-600"}>
        {cell.title}
      </span>
    </div>
  );
}
