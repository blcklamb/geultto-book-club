import { SUMMER_BINGO_THEMES } from "../data/themes";
import { createInitialBoard } from "./bingoLogic";
import type { BingoBoard, BingoCell, CellPhoto } from "../types";

export const SUMMER_BINGO_STORAGE_KEY = "summer-book-bingo:v1";

export function loadBoardFromStorage(
  storage: Storage = window.localStorage,
): BingoBoard | null {
  const raw = storage.getItem(SUMMER_BINGO_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeBoard(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveBoardToStorage(
  board: BingoBoard,
  storage: Storage = window.localStorage,
) {
  storage.setItem(SUMMER_BINGO_STORAGE_KEY, JSON.stringify(board));
}

export function clearBoardStorage(storage: Storage = window.localStorage) {
  storage.removeItem(SUMMER_BINGO_STORAGE_KEY);
}

export function normalizeBoard(value: unknown): BingoBoard | null {
  if (!isRecord(value) || !Array.isArray(value.cells)) {
    return null;
  }

  const fallback = createInitialBoard();
  const storedCells = value.cells;
  const cells = fallback.cells.map((fallbackCell, index) => {
    const storedCell = storedCells[index];
    if (!isRecord(storedCell)) {
      return fallbackCell;
    }

    const photo = normalizePhoto(storedCell.photo);
    const completedAt =
      typeof storedCell.completedAt === "string"
        ? storedCell.completedAt
        : photo
          ? fallback.updatedAt
          : undefined;

    return {
      ...fallbackCell,
      title: SUMMER_BINGO_THEMES[index] ?? fallbackCell.title,
      photo,
      completedAt,
    } satisfies BingoCell;
  });

  return {
    ...fallback,
    title: "여름 책 빙고",
    cells,
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt,
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
  };
}

function normalizePhoto(value: unknown): CellPhoto | undefined {
  if (!isRecord(value) || typeof value.dataUrl !== "string") {
    return undefined;
  }

  if (!value.dataUrl.startsWith("data:image/")) {
    return undefined;
  }

  return {
    dataUrl: value.dataUrl,
    fileName: typeof value.fileName === "string" ? value.fileName : undefined,
    width: typeof value.width === "number" ? value.width : 0,
    height: typeof value.height === "number" ? value.height : 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
