import { describe, expect, it } from "vitest";
import { getParentPathname, getVisibleNavItems } from "../navigation";

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

  it("비로그인 상태에서는 공개 메뉴만 반환한다", () => {
    expect(getVisibleNavItems(false).map((item) => item.label)).toEqual([
      "일정",
      "여름 팔레트",
      "인상 깊은 구절",
    ]);
  });

  it("로그인 상태에서는 전체 기본 메뉴를 반환한다", () => {
    expect(getVisibleNavItems(true).map((item) => item.label)).toEqual([
      "일정",
      "여름 팔레트",
      "독후감",
      "인상 깊은 구절",
      "토론",
      "내 프로필",
    ]);
  });
});
