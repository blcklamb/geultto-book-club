"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { isCellFilled } from "../lib/paletteLogic";
import type { PaletteCell } from "../types";

type ProgressListItemProps = {
  cell: PaletteCell;
};

export function ProgressListItem({ cell }: ProgressListItemProps) {
  const filled = isCellFilled(cell);

  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-2 text-sm">
      {filled ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={filled ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {cell.title}
      </span>
    </div>
  );
}
