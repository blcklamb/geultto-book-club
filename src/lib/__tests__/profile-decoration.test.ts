import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE_DECORATION,
  getProfileDecorationLabel,
  normalizeProfileDecoration,
} from "../profile-decoration";

describe("profile-decoration", () => {
  it("제거된 장식 id는 기본 장식으로 정규화한다", () => {
    expect(normalizeProfileDecoration("pencil")).toBe(
      DEFAULT_PROFILE_DECORATION,
    );
    expect(normalizeProfileDecoration("eye-patch")).toBe(
      DEFAULT_PROFILE_DECORATION,
    );
  });

  it("새 장식 라벨을 반환한다", () => {
    expect(getProfileDecorationLabel("star")).toBe("별");
    expect(getProfileDecorationLabel("sprout")).toBe("새싹");
  });
});
