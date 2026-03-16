import { describe, it, expect, vi, beforeEach } from "vitest";
import { cn, randomBookEmoji, randomPastel } from "../utils";

const BOOK_EMOJIS = [
  "📕", "📗", "📘", "📙", "📓", "📔", "📒", "📚", "📖", "📄",
  "📃", "📑", "🔖", "🏷️", "📝", "✏️", "✒️", "🖋️", "🖊️", "🖌️",
  "📇", "🗂️", "📁", "📂", "📜", "📃", "📄", "📦", "📰", "🗞️",
  "📡", "📚", "🏛️", "🏫", "🧠", "💡", "🎓", "📅", "🗒️", "🗓️",
];

const PASTEL_COLORS = ["#F1F5F9", "#FEF3C7", "#E0F2FE", "#FDE68A", "#F3E8FF"];

describe("cn", () => {
  it("단일 클래스명을 그대로 반환한다", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("여러 클래스명을 공백으로 합친다", () => {
    expect(cn("text-red-500", "bg-white")).toBe("text-red-500 bg-white");
  });

  it("충돌하는 Tailwind 클래스를 마지막 값으로 병합한다", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("falsy 값을 무시한다", () => {
    expect(cn("text-red-500", false, null, undefined, "bg-white")).toBe(
      "text-red-500 bg-white"
    );
  });

  it("조건부 클래스를 처리한다", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("인수가 없으면 빈 문자열을 반환한다", () => {
    expect(cn()).toBe("");
  });
});

describe("randomBookEmoji", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("정의된 이모지 목록 중 하나를 반환한다", () => {
    const result = randomBookEmoji();
    expect(BOOK_EMOJIS).toContain(result);
  });

  it("여러 번 호출해도 항상 목록 내의 이모지를 반환한다", () => {
    for (let i = 0; i < 50; i++) {
      expect(BOOK_EMOJIS).toContain(randomBookEmoji());
    }
  });

  it("Math.random이 0일 때 첫 번째 이모지를 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(randomBookEmoji()).toBe("📕");
  });

  it("Math.random이 최댓값에 가까울 때 마지막 이모지를 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    const result = randomBookEmoji();
    expect(BOOK_EMOJIS).toContain(result);
  });
});

describe("randomPastel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("정의된 파스텔 색상 목록 중 하나를 반환한다", () => {
    const result = randomPastel();
    expect(PASTEL_COLORS).toContain(result);
  });

  it("여러 번 호출해도 항상 목록 내의 색상을 반환한다", () => {
    for (let i = 0; i < 30; i++) {
      expect(PASTEL_COLORS).toContain(randomPastel());
    }
  });

  it("Math.random이 0일 때 첫 번째 색상을 반환한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(randomPastel()).toBe("#F1F5F9");
  });

  it("반환값이 hex 색상 코드 형식이다", () => {
    const result = randomPastel();
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
