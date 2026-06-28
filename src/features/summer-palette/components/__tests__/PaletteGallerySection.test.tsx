import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInitialBoard,
  withUpdatedCellPhoto,
} from "../../lib/paletteLogic";
import { usePaletteGallery } from "../../hooks/usePaletteGallery";
import type { CellPhoto, PaletteGalleryItem } from "../../types";
import { PaletteGallerySection } from "../PaletteGallerySection";

vi.mock("../../hooks/usePaletteGallery", () => ({
  usePaletteGallery: vi.fn(),
}));

const usePaletteGalleryMock = vi.mocked(usePaletteGallery);

const PHOTO: CellPhoto = {
  dataUrl: "data:image/jpeg;base64,photo",
  fileName: "photo.jpg",
  width: 640,
  height: 480,
};

describe("PaletteGallerySection", () => {
  beforeEach(() => {
    usePaletteGalleryMock.mockReset();
  });

  it("does not load the gallery for users who cannot view it", () => {
    usePaletteGalleryMock.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
    });

    const { container, unmount } = renderGallery(
      <PaletteGallerySection canView={false} />,
    );

    expect(usePaletteGalleryMock).toHaveBeenCalledWith(false);
    expect(container.textContent).toContain(
      "로그인한 승인 멤버만 다른 사람들의 팔레트를 볼 수 있습니다.",
    );
    unmount();
  });

  it("renders complete palettes without blur and incomplete palettes with blur", () => {
    usePaletteGalleryMock.mockReturnValue({
      items: [createGalleryItem(true), createGalleryItem(false)],
      isLoading: false,
      error: null,
    });

    const { container, unmount } = renderGallery(
      <PaletteGallerySection canView />,
    );
    const cards = container.querySelectorAll("article");

    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector(".blur-sm")).toBeNull();
    expect(cards[1].querySelector(".blur-sm")).not.toBeNull();
    expect(container.textContent).toContain("완성");
    expect(container.textContent).toContain("미완성");
    unmount();
  });

  it("renders loading, empty, and error states", () => {
    usePaletteGalleryMock.mockReturnValueOnce({
      items: [],
      isLoading: true,
      error: null,
    });
    const { container, rerender, unmount } = renderGallery(
      <PaletteGallerySection canView />,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();

    usePaletteGalleryMock.mockReturnValueOnce({
      items: [],
      isLoading: false,
      error: null,
    });
    rerender(<PaletteGallerySection canView />);
    expect(container.textContent).toContain(
      "아직 다른 멤버가 저장한 팔레트가 없습니다.",
    );

    usePaletteGalleryMock.mockReturnValueOnce({
      items: [],
      isLoading: false,
      error: "불러오기 실패",
    });
    rerender(<PaletteGallerySection canView />);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "불러오기 실패",
    );
    unmount();
  });
});

function renderGallery(ui: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    rerender(nextUi: ReactNode) {
      act(() => {
        root.render(nextUi);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function createGalleryItem(isFullClear: boolean): PaletteGalleryItem {
  let board = createInitialBoard();

  if (isFullClear) {
    board.cells.forEach((cell) => {
      board = withUpdatedCellPhoto(board, cell.index, PHOTO);
    });
  }

  return {
    userId: isFullClear ? "full-user" : "draft-user",
    nickname: isFullClear ? "완성러" : "진행러",
    profileImageUrl: null,
    profileDecoration: "none",
    board,
    filledCount: isFullClear ? 9 : 4,
    isFullClear,
    updatedAt: "2026-06-28T01:41:00.000Z",
  };
}
