"use client";

import { BingoCellItem } from "./BingoCellItem";
import type { BingoBoard as BingoBoardType, BingoCell } from "../types";

type BingoBoardProps = {
  board: BingoBoardType;
  onSelectCell: (cell: BingoCell) => void;
};

export function BingoBoard({
  board,
  onSelectCell,
}: BingoBoardProps) {
  return (
    <div className="mx-auto w-full max-w-[680px]">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-orange-100 shadow-sm ring-1 ring-orange-200">
        <div className="grid h-full grid-cols-3 gap-0">
          {board.cells.map((cell) => (
            <BingoCellItem
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
