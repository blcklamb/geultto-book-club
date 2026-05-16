import { describe, expect, it } from "vitest";
import { getParentPathname } from "../navigation";

describe("navigation", () => {
  it("상세 경로에서 상위 목록 경로를 반환한다", () => {
    expect(getParentPathname("/reviews/123")).toBe("/reviews");
    expect(getParentPathname("/topics/new")).toBe("/topics");
    expect(getParentPathname("/schedule/abc/quotes")).toBe("/schedule/abc");
  });

  it("최상위 경로는 홈으로 정규화한다", () => {
    expect(getParentPathname("/reviews")).toBe("/");
    expect(getParentPathname("/")).toBe("/");
    expect(getParentPathname(undefined)).toBe("/");
  });
});