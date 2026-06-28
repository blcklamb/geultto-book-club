import { SUMMER_PALETTE_THEMES } from "../data/themes";
import type { PaletteBoard, PaletteCell, CellPhoto } from "../types";

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

export type PaletteLine = (typeof LINES)[number];

export function createInitialBoard(now = new Date()): PaletteBoard {
  const timestamp = now.toISOString();

  return {
    id: "summer-book-palette",
    title: "여름 책 팔레트",
    size: 3,
    cells: SUMMER_PALETTE_THEMES.map((title, index) => ({
      id: `summer-palette-cell-${index + 1}`,
      index,
      type: "theme",
      title,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isCellFilled(cell: PaletteCell) {
  return Boolean(cell.photo?.dataUrl);
}

export function getCompletedLines(board: PaletteBoard) {
  return LINES.filter((line) =>
    line.every((index) => isCellFilled(board.cells[index])),
  );
}

export function hasCompletedPaletteLine(board: PaletteBoard) {
  return getCompletedLines(board).length > 0;
}

export function isFullClear(board: PaletteBoard) {
  return board.cells.every(isCellFilled);
}

export function getFilledCount(board: PaletteBoard) {
  return board.cells.filter(isCellFilled).length;
}

export function getCompletedLineKeys(board: PaletteBoard) {
  return new Set(getCompletedLines(board).map((line) => line.join("-")));
}

export function getHighlightedCellIndexes(board: PaletteBoard) {
  return new Set(getCompletedLines(board).flat());
}

export function withUpdatedCellPhoto(
  board: PaletteBoard,
  cellIndex: number,
  photo: CellPhoto,
  now = new Date(),
): PaletteBoard {
  return updateCell(board, cellIndex, {
    photo,
    completedAt: now.toISOString(),
  }, now);
}

export function withClearedCellPhoto(
  board: PaletteBoard,
  cellIndex: number,
  now = new Date(),
): PaletteBoard {
  return updateCell(board, cellIndex, {
    photo: undefined,
    completedAt: undefined,
  }, now);
}

function updateCell(
  board: PaletteBoard,
  cellIndex: number,
  patch: Partial<PaletteCell>,
  now: Date,
): PaletteBoard {
  return {
    ...board,
    cells: board.cells.map((cell) =>
      cell.index === cellIndex ? { ...cell, ...patch } : cell,
    ),
    updatedAt: now.toISOString(),
  };
}
