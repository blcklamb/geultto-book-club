import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialBoard,
  withUpdatedCellPhoto,
} from "../../lib/paletteLogic";
import type { CellPhoto } from "../../types";
import {
  downloadBlob,
  renderBoardToBlob,
  renderBoardToPng,
} from "../useImageExport";

const PHOTO: CellPhoto = {
  dataUrl: "data:image/jpeg;base64,photo",
  fileName: "photo.jpg",
  width: 640,
  height: 480,
};

describe("summer palette image export", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("draws uploaded photos without nesting canvas state across async image loads", async () => {
    let saveDepth = 0;
    let maxSaveDepth = 0;
    const ctx = createMockCanvasContext({
      onDrawImage: vi.fn(),
      onSave: () => {
        saveDepth += 1;
        maxSaveDepth = Math.max(maxSaveDepth, saveDepth);
      },
      onRestore: () => {
        saveDepth -= 1;
      },
    });
    const canvas = createMockCanvas(ctx);
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(
      ((tagName: string) => {
        if (tagName === "canvas") {
          return canvas;
        }

        return originalCreateElement(tagName);
      }) as typeof document.createElement,
    );
    vi.stubGlobal("Image", MockImage);

    let board = createInitialBoard();
    const completedAt = new Date(2026, 5, 28, 1, 41);
    board.cells.forEach((cell) => {
      board = withUpdatedCellPhoto(board, cell.index, PHOTO, completedAt);
    });

    await expect(renderBoardToPng(board)).resolves.toBe("data:image/png;base64,export");
    expect(ctx.drawImage).toHaveBeenCalledTimes(9);
    expect(maxSaveDepth).toBeLessThanOrEqual(2);
    expect(ctx.fillText).toHaveBeenCalledWith(
      "06.28 01:41",
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.fillText).not.toHaveBeenCalledWith(
      expect.stringContaining("9/9칸 완료"),
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.stroke).toHaveBeenCalledTimes(27);
  });

  it("renders the board to a PNG blob for reliable downloads", async () => {
    const ctx = createMockCanvasContext({
      onDrawImage: vi.fn(),
      onSave: vi.fn(),
      onRestore: vi.fn(),
    });
    const canvas = createMockCanvas(ctx);
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(
      ((tagName: string) => {
        if (tagName === "canvas") {
          return canvas;
        }

        return originalCreateElement(tagName);
      }) as typeof document.createElement,
    );

    const blob = await renderBoardToBlob(createInitialBoard());

    expect(blob.type).toBe("image/png");
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
  });

  it("downloads generated blobs through an object URL", () => {
    const objectUrl = "blob:summer-palette";
    const createObjectURL = vi.fn(() => objectUrl);
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    vi.useFakeTimers();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    downloadBlob(new Blob(["png"], { type: "image/png" }));

    const link = document.querySelector<HTMLAnchorElement>(
      'a[download="summer-book-palette.png"]',
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(link).toBeNull();
    expect(click).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
  });
});

class MockImage {
  width = 640;
  height = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    window.setTimeout(() => this.onload?.(), 0);
  }
}

function createMockCanvas(ctx: ReturnType<typeof createMockCanvasContext>) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((callback: BlobCallback) => {
      callback(new Blob(["png"], { type: "image/png" }));
    }),
    toDataURL: vi.fn(() => "data:image/png;base64,export"),
  } as unknown as HTMLCanvasElement;
}

function createMockCanvasContext({
  onDrawImage,
  onSave,
  onRestore,
}: {
  onDrawImage: ReturnType<typeof vi.fn>;
  onSave: () => void;
  onRestore: () => void;
}) {
  return {
    fillStyle: "",
    font: "",
    lineCap: "butt",
    lineJoin: "miter",
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: "",
    strokeStyle: "",
    textBaseline: "alphabetic",
    arc: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: onDrawImage,
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(onRestore),
    save: vi.fn(onSave),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}
