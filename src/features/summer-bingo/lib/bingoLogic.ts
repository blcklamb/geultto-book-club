import { SUMMER_BINGO_THEMES } from "../data/themes";
import type { BingoBoard, BingoCell, CellPhoto } from "../types";

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export type BingoLine = (typeof LINES)[number];

export function createInitialBoard(now = new Date()): BingoBoard {
  const timestamp = now.toISOString();

  return {
    id: "summer-book-bingo",
    title: "여름 책 팔레트",
    size: 3,
    cells: SUMMER_BINGO_THEMES.map((title, index) => ({
      id: `summer-bingo-cell-${index + 1}`,
      index,
      type: "theme",
      title,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isCellFilled(cell: BingoCell) {
  return Boolean(cell.photo?.dataUrl);
}

export function getCompletedLines(board: BingoBoard) {
  return LINES.filter((line) =>
    line.every((index) => isCellFilled(board.cells[index])),
  );
}

export function isBingo(board: BingoBoard) {
  return getCompletedLines(board).length > 0;
}

export function isFullClear(board: BingoBoard) {
  return board.cells.every(isCellFilled);
}

export function getFilledCount(board: BingoBoard) {
  return board.cells.filter(isCellFilled).length;
}

export function getCompletedLineKeys(board: BingoBoard) {
  return new Set(getCompletedLines(board).map((line) => line.join("-")));
}

export function getHighlightedCellIndexes(board: BingoBoard) {
  return new Set(getCompletedLines(board).flat());
}

export function withUpdatedCellPhoto(
  board: BingoBoard,
  cellIndex: number,
  photo: CellPhoto,
  now = new Date(),
): BingoBoard {
  return updateCell(board, cellIndex, {
    photo,
    completedAt: now.toISOString(),
  }, now);
}

export function withClearedCellPhoto(
  board: BingoBoard,
  cellIndex: number,
  now = new Date(),
): BingoBoard {
  return updateCell(board, cellIndex, {
    photo: undefined,
    completedAt: undefined,
  }, now);
}

function updateCell(
  board: BingoBoard,
  cellIndex: number,
  patch: Partial<BingoCell>,
  now: Date,
): BingoBoard {
  return {
    ...board,
    cells: board.cells.map((cell) =>
      cell.index === cellIndex ? { ...cell, ...patch } : cell,
    ),
    updatedAt: now.toISOString(),
  };
}
