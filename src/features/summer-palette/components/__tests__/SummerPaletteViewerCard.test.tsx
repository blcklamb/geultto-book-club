import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { SummerPaletteViewerCard } from "../SummerPaletteViewerCard";

describe("SummerPaletteViewerCard", () => {
  it("renders an empty palette summary", () => {
    const { container, unmount } = renderViewer(
      <SummerPaletteViewerCard updatedAt={null} />,
    );

    expect(container.textContent).toContain("나의 여름 팔레트");
    expect(container.textContent).toContain("미시작");
    expect(container.textContent).toContain("아직 저장한 팔레트가 없습니다");
    expect(container.textContent).toContain("아직 저장된 기록 없음");
    expect(container.textContent).toContain("팔레트 시작하기");
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/summer-palette",
    );

    unmount();
  });

  it("renders a saved palette summary with app timezone", () => {
    const updatedAt = "2026-07-04T10:05:00.000Z";

    const { container, unmount } = renderViewer(
      <SummerPaletteViewerCard updatedAt={updatedAt} />,
    );

    expect(container.textContent).toContain("저장됨");
    expect(container.textContent).toContain("저장한 팔레트가 있습니다");
    expect(container.textContent).toContain("07.04 19:05");
    expect(container.textContent).toContain("팔레트 보러가기");
    expect(container.querySelectorAll("img")).toHaveLength(0);

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
