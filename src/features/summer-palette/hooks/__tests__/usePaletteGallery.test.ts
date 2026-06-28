import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialBoard,
  withUpdatedCellPhoto,
} from "../../lib/paletteLogic";
import type { CellPhoto } from "../../types";
import { loadPaletteGallery } from "../usePaletteGallery";

const PHOTO: CellPhoto = {
  dataUrl: "data:image/jpeg;base64,photo",
  fileName: "photo.jpg",
  width: 640,
  height: 480,
};

describe("summer palette gallery loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a successful gallery response", async () => {
    let board = createInitialBoard();
    board.cells.forEach((cell) => {
      board = withUpdatedCellPhoto(board, cell.index, PHOTO);
    });

    stubFetchResponse(200, {
      items: [
        {
          userId: "user-2",
          nickname: "여름러",
          profileImageUrl: null,
          profileDecoration: "dog",
          board,
          filledCount: 9,
          isFullClear: true,
          updatedAt: "2026-06-28T01:41:00.000Z",
        },
      ],
    });

    const items = await loadPaletteGallery();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      userId: "user-2",
      nickname: "여름러",
      filledCount: 9,
      isFullClear: true,
    });
    expect(items[0].board.cells[0].photo?.dataUrl).toBe(PHOTO.dataUrl);
  });

  it("returns an empty list for empty gallery responses", async () => {
    stubFetchResponse(200, { items: [] });

    await expect(loadPaletteGallery()).resolves.toEqual([]);
  });

  it("strips photos from incomplete gallery items", async () => {
    const board = withUpdatedCellPhoto(createInitialBoard(), 0, PHOTO);

    stubFetchResponse(200, {
      items: [
        {
          userId: "user-3",
          nickname: "진행러",
          profileImageUrl: null,
          profileDecoration: "none",
          board,
          filledCount: 1,
          isFullClear: false,
          updatedAt: "2026-06-28T01:41:00.000Z",
        },
      ],
    });

    const items = await loadPaletteGallery();

    expect(items[0].board.cells[0].photo).toBeUndefined();
  });

  it("surfaces approval errors", async () => {
    stubFetchResponse(403, { message: "forbidden" });

    await expect(loadPaletteGallery()).rejects.toThrow(
      "승인된 회원만 다른 사람들의 팔레트를 볼 수 있습니다.",
    );
  });

  it("surfaces server errors", async () => {
    stubFetchResponse(500, { message: "server error" });

    await expect(loadPaletteGallery()).rejects.toThrow(
      "다른 사람들의 팔레트를 불러오지 못했습니다.",
    );
  });
});

function stubFetchResponse(status: number, payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}
