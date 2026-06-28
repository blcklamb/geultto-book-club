import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { createInitialBoard } from "../../lib/paletteLogic";
import { SaveBoardButton } from "../SaveBoardButton";

describe("SaveBoardButton", () => {
  it("alerts instead of downloading when the board is incomplete", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSave = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    act(() => {
      root.render(
      <SaveBoardButton
        board={createInitialBoard()}
        canSave={false}
        isExporting={false}
        onSave={onSave}
      />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.disabled).toBe(false);
    expect(button?.textContent).toContain("팔레트 저장");

    act(() => {
      button?.click();
    });

    expect(alertSpy).toHaveBeenCalledWith("완성 시 다운로드 가능합니다");
    expect(onSave).not.toHaveBeenCalled();

    alertSpy.mockRestore();
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
