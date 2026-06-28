"use client";

import { PaletteCellItem } from "./PaletteCellItem";
import type { PaletteBoard as PaletteBoardType, PaletteCell } from "../types";

type PaletteBoardProps = {
  board: PaletteBoardType;
  onSelectCell: (cell: PaletteCell) => void;
};

export function PaletteBoard({
  board,
  onSelectCell,
}: PaletteBoardProps) {
  return (
    <div className="mx-auto w-full max-w-[680px]">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-orange-100 shadow-sm ring-1 ring-orange-200">
        <div className="grid h-full grid-cols-3 gap-0">
          {board.cells.map((cell) => (
            <PaletteCellItem
              key={cell.id}
              cell={cell}
              onSelect={onSelectCell}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
