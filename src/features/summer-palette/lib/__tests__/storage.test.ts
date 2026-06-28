import { describe, expect, it } from "vitest";
import { createInitialBoard, withUpdatedCellPhoto } from "../paletteLogic";
import {
  SUMMER_PALETTE_STORAGE_KEY,
  clearBoardStorage,
  getBoardStorageKey,
  loadBoardFromStorage,
  saveBoardToStorage,
} from "../storage";
import type { CellPhoto } from "../types";

const PHOTO: CellPhoto = {
  dataUrl: "data:image/jpeg;base64,secret-photo",
  fileName: "secret.jpg",
  width: 320,
  height: 240,
};

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => map.delete(key),
    setItem: (key, value) => map.set(key, value),
  } satisfies Storage;
}

describe("getBoardStorageKey", () => {
  it("returns the shared key for anonymous sessions", () => {
    expect(getBoardStorageKey()).toBe(SUMMER_PALETTE_STORAGE_KEY);
    expect(getBoardStorageKey(null)).toBe(SUMMER_PALETTE_STORAGE_KEY);
  });

  it("namespaces the key per signed-in user", () => {
    expect(getBoardStorageKey("user-a")).toBe(
      `${SUMMER_PALETTE_STORAGE_KEY}:user:user-a`,
    );
    expect(getBoardStorageKey("user-b")).not.toBe(getBoardStorageKey("user-a"));
  });
});

describe("per-user board isolation", () => {
  it("does not expose one user's board to another user on the same browser", () => {
    const storage = createMemoryStorage();

    const boardA = withUpdatedCellPhoto(createInitialBoard(), 0, PHOTO);
    saveBoardToStorage(boardA, getBoardStorageKey("user-a"), storage);

    // 다른 사용자가 같은 브라우저로 로그인하면 자신의 키에는 보드가 없어야 한다.
    const loadedForB = loadBoardFromStorage(getBoardStorageKey("user-b"), storage);
    expect(loadedForB).toBeNull();

    // 본인 키로는 사진이 그대로 복원된다.
    const loadedForA = loadBoardFromStorage(getBoardStorageKey("user-a"), storage);
    expect(loadedForA?.cells[0].photo?.dataUrl).toBe(PHOTO.dataUrl);
  });

  it("clears only the targeted user's board", () => {
    const storage = createMemoryStorage();
    saveBoardToStorage(
      withUpdatedCellPhoto(createInitialBoard(), 1, PHOTO),
      getBoardStorageKey("user-a"),
      storage,
    );
    saveBoardToStorage(
      withUpdatedCellPhoto(createInitialBoard(), 2, PHOTO),
      getBoardStorageKey("user-b"),
      storage,
    );

    clearBoardStorage(getBoardStorageKey("user-a"), storage);

    expect(loadBoardFromStorage(getBoardStorageKey("user-a"), storage)).toBeNull();
    expect(
      loadBoardFromStorage(getBoardStorageKey("user-b"), storage)?.cells[2].photo
        ?.dataUrl,
    ).toBe(PHOTO.dataUrl);
  });
});

describe("storage access failures", () => {
  it("returns null instead of throwing when getItem is blocked", () => {
    const blockedStorage = {
      ...createMemoryStorage(),
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    } as Storage;

    expect(() =>
      loadBoardFromStorage(SUMMER_PALETTE_STORAGE_KEY, blockedStorage),
    ).not.toThrow();
    expect(
      loadBoardFromStorage(SUMMER_PALETTE_STORAGE_KEY, blockedStorage),
    ).toBeNull();
  });

  it("returns null when no storage is available (SSR)", () => {
    expect(loadBoardFromStorage(SUMMER_PALETTE_STORAGE_KEY, null)).toBeNull();
  });

  it("ignores blocked removeItem during clear", () => {
    const blockedStorage = {
      ...createMemoryStorage(),
      removeItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    } as Storage;

    expect(() =>
      clearBoardStorage(SUMMER_PALETTE_STORAGE_KEY, blockedStorage),
    ).not.toThrow();
  });
});
