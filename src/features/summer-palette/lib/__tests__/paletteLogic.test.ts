import { describe, expect, it } from "vitest";
import {
  createInitialBoard,
  getCompletedLines,
  getFilledCount,
  hasCompletedPaletteLine,
  isCellFilled,
  isFullClear,
  withClearedCellPhoto,
  withUpdatedCellPhoto,
} from "../paletteLogic";
import type { CellPhoto } from "../../types";

const PHOTO: CellPhoto = {
  dataUrl: "data:image/jpeg;base64,photo",
  fileName: "photo.jpg",
  width: 640,
  height: 480,
};

describe("summer palette logic", () => {
  it("creates a fixed 3x3 board with nine theme cells", () => {
    const board = createInitialBoard(new Date("2026-06-01T00:00:00.000Z"));

    expect(board.title).toBe("여름 책 팔레트");
    expect(board.size).toBe(3);
    expect(board.cells).toHaveLength(9);
    expect(board.cells.every((cell) => cell.type === "theme")).toBe(true);
    expect(board.cells.map((cell) => cell.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("marks a cell filled only when it has a photo", () => {
    const board = createInitialBoard();
    const updated = withUpdatedCellPhoto(board, 0, PHOTO);

    expect(isCellFilled(board.cells[0])).toBe(false);
    expect(isCellFilled(updated.cells[0])).toBe(true);
    expect(getFilledCount(updated)).toBe(1);
  });

  it("detects completed rows, columns, and diagonals", () => {
    let board = createInitialBoard();
    [0, 1, 2, 4, 6].forEach((index) => {
      board = withUpdatedCellPhoto(board, index, PHOTO);
    });

    expect(getCompletedLines(board)).toEqual([
      [0, 1, 2],
      [2, 4, 6],
    ]);
    expect(hasCompletedPaletteLine(board)).toBe(true);
    expect(isFullClear(board)).toBe(false);
  });

  it("requires all nine cells for full clear", () => {
    let board = createInitialBoard();
    board.cells.forEach((cell) => {
      board = withUpdatedCellPhoto(board, cell.index, PHOTO);
    });

    expect(getFilledCount(board)).toBe(9);
    expect(isFullClear(board)).toBe(true);
  });

  it("can clear a photo without losing the theme title", () => {
    const board = createInitialBoard();
    const filled = withUpdatedCellPhoto(board, 3, PHOTO);
    const cleared = withClearedCellPhoto(filled, 3);

    expect(isCellFilled(cleared.cells[3])).toBe(false);
    expect(cleared.cells[3].title).toBe(board.cells[3].title);
    expect(cleared.cells[3].completedAt).toBeUndefined();
  });
});
