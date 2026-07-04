import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  createInitialBoard,
  withUpdatedCellPhoto,
} from "../../lib/paletteLogic";
import type { CellPhoto } from "../../types";
import { SummerPaletteViewerCard } from "../SummerPaletteViewerCard";

const PHOTO: CellPhoto = {
  dataUrl: "data:image/jpeg;base64,photo",
  fileName: "photo.jpg",
  width: 640,
  height: 480,
};

describe("SummerPaletteViewerCard", () => {
  it("renders an empty palette in viewer mode", () => {
    const { container, unmount } = renderViewer(
      <SummerPaletteViewerCard board={createInitialBoard()} updatedAt={null} />,
    );

    expect(container.textContent).toContain("나의 여름 팔레트");
    expect(container.textContent).toContain("0/9칸 완료");
    expect(container.textContent).toContain("아직 저장된 기록 없음");
    expect(container.textContent).toContain("팔레트 시작하기");
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/summer-palette",
    );

    unmount();
  });

  it("renders a completed palette with photos and saved time", () => {
    let board = createInitialBoard();
    const completedAt = new Date(2026, 6, 4, 10, 5);
    board.cells.forEach((cell) => {
      board = withUpdatedCellPhoto(board, cell.index, PHOTO, completedAt);
    });

    const { container, unmount } = renderViewer(
      <SummerPaletteViewerCard
        board={board}
        updatedAt={completedAt.toISOString()}
      />,
    );

    expect(container.textContent).toContain("완성");
    expect(container.textContent).toContain("9/9칸 완료");
    expect(container.textContent).toContain("07.04 10:05");
    expect(container.textContent).toContain("팔레트 보러가기");
    expect(container.querySelectorAll("img")).toHaveLength(9);

    unmount();
  });
});

function renderViewer(ui: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}
