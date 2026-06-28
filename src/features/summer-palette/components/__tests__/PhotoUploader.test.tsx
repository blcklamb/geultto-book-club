import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { PhotoUploader } from "../PhotoUploader";

describe("PhotoUploader", () => {
  it("offers separate camera and gallery inputs", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PhotoUploader onPhotoReady={vi.fn()} />);
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(
      buttons.some((button) => button.textContent?.includes("사진 촬영")),
    ).toBe(true);
    expect(
      buttons.some((button) => button.textContent?.includes("갤러리 선택")),
    ).toBe(true);

    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="file"]'),
    );

    expect(inputs).toHaveLength(2);
    expect(inputs[0].getAttribute("accept")).toBe("image/*");
    expect(inputs[0].hasAttribute("capture")).toBe(false);
    expect(inputs[1].getAttribute("accept")).toBe("image/*");
    expect(inputs[1].getAttribute("capture")).toBe("environment");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("blocks upload and shows login dialog when upload is not allowed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onPhotoReady = vi.fn();

    act(() => {
      root.render(
        <PhotoUploader
          onPhotoReady={onPhotoReady}
          isUploadAllowed={false}
        />,
      );
    });

    const galleryButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("갤러리 선택"),
    );

    act(() => {
      galleryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("로그인이 필요합니다");
    expect(document.body.textContent).toContain("로그인");
    expect(onPhotoReady).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
