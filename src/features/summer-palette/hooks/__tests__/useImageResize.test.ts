import { afterEach, describe, expect, it, vi } from "vitest";
import { formatPaletteTimestamp, resizeImageFile } from "../useImageResize";

describe("summer palette image resize helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("formats palette timestamps as MM.DD hh:MM", () => {
    const timestamp = formatPaletteTimestamp(new Date(2026, 5, 8, 9, 7));

    expect(timestamp).toBe("06.08 09:07");
  });

  it("keeps resized photos free of timestamp overlays", async () => {
    const ctx = createMockCanvasContext();
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

    const photo = await resizeImageFile(
      new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
    );

    expect(photo.dataUrl).toBe("data:image/jpeg;base64,resized");
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).not.toHaveBeenCalled();
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
    toDataURL: vi.fn(() => "data:image/jpeg;base64,resized"),
  } as unknown as HTMLCanvasElement;
}

function createMockCanvasContext() {
  return {
    fillStyle: "",
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}
