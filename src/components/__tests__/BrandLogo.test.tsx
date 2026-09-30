import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandLogo } from "../BrandLogo";

describe("BrandLogo", () => {
  it("배경 사각형 없이 펼친 책 도형만 그린다", () => {
    const { container } = render(<BrandLogo />);
    expect(container.querySelector("rect")).toBeNull();
    expect(container.querySelectorAll("g > path")).toHaveLength(2);
  });

  it("책갈피는 오른쪽 면 안으로 잘리도록 고유한 clipPath를 참조한다", () => {
    const { container } = render(
      <>
        <BrandLogo />
        <BrandLogo />
      </>,
    );
    const ids = [...container.querySelectorAll("clipPath")].map((el) => el.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    const bookmark = container.querySelector("svg [clip-path]");
    expect(bookmark?.getAttribute("clip-path")).toBe(`url(#${ids[0]})`);
  });

  it("옆의 서비스명 텍스트와 중복되지 않도록 보조기기에서 숨긴다", () => {
    const { container } = render(<BrandLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("색상은 하드코딩하지 않고 디자인 토큰 변수만 사용한다", () => {
    const { container } = render(<BrandLogo />);
    const colors = [...container.querySelectorAll("[fill], [stroke]")].flatMap(
      (el) => [el.getAttribute("fill"), el.getAttribute("stroke")],
    );
    const used = colors.filter((c): c is string => !!c && c !== "none");
    expect(used.length).toBeGreaterThan(0);
    expect(used.every((c) => /^var\(--primary(-foreground)?\)$/.test(c))).toBe(
      true,
    );
  });

  it("className으로 크기를 바꿀 수 있고 기본 크기는 32px(h-8)이다", () => {
    const { container, rerender } = render(<BrandLogo />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain(
      "h-8",
    );
    rerender(<BrandLogo className="h-6 w-6" />);
    const cls = container.querySelector("svg")?.getAttribute("class") ?? "";
    expect(cls).toContain("h-6");
    expect(cls).not.toContain("h-8");
  });
});
