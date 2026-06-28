import { SUMMER_PALETTE_THEMES } from "../data/themes";
import { createInitialBoard } from "./paletteLogic";
import type { PaletteBoard, PaletteCell, CellPhoto } from "../types";

export const SUMMER_PALETTE_STORAGE_KEY = "summer-book-palette:v1";

/**
 * 로컬 보드 캐시는 로그인한 사용자별로 분리해 저장한다.
 * 같은 브라우저를 공유할 때 다른 계정/익명 세션의 보드(사진 포함)가
 * 다음 사용자 계정으로 새어 나가는 것을 방지한다.
 */
export function getBoardStorageKey(userId?: string | null) {
  return userId
    ? `${SUMMER_PALETTE_STORAGE_KEY}:user:${userId}`
    : SUMMER_PALETTE_STORAGE_KEY;
}

export function loadBoardFromStorage(
  key: string = SUMMER_PALETTE_STORAGE_KEY,
  storage: Storage | null = getDefaultStorage(),
): PaletteBoard | null {
  if (!storage) {
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    // 사생활 보호 모드 등 localStorage 접근이 차단된 환경에서는 빈 보드로 폴백한다.
    return null;
  }

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
  board: PaletteBoard,
  key: string = SUMMER_PALETTE_STORAGE_KEY,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!storage) {
    return;
  }
  storage.setItem(key, JSON.stringify(board));
}

export function clearBoardStorage(
  key: string = SUMMER_PALETTE_STORAGE_KEY,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // 저장소 접근이 차단된 환경에서는 조용히 무시한다.
  }
}

function getDefaultStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function normalizeBoard(value: unknown): PaletteBoard | null {
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
      title: SUMMER_PALETTE_THEMES[index] ?? fallbackCell.title,
      photo,
      completedAt,
    } satisfies PaletteCell;
  });

  return {
    ...fallback,
    title: "여름 책 팔레트",
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
