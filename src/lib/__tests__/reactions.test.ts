import { describe, it, expect } from "vitest";
import { sortReactions, summarizeReactions } from "../reactions";
import type { ReactionSummary } from "../reactions";

describe("sortReactions", () => {
  it("count가 높은 순서로 정렬한다", () => {
    const reactions: ReactionSummary[] = [
      { emoji: "👍", count: 1, reactedByUser: false, nicknames: [] },
      { emoji: "❤️", count: 5, reactedByUser: false, nicknames: [] },
      { emoji: "😂", count: 3, reactedByUser: false, nicknames: [] },
    ];

    const sorted = sortReactions(reactions);
    expect(sorted.map((r) => r.emoji)).toEqual(["❤️", "😂", "👍"]);
  });

  it("count가 같으면 emoji를 알파벳 순으로 정렬한다", () => {
    const reactions: ReactionSummary[] = [
      { emoji: "😂", count: 2, reactedByUser: false, nicknames: [] },
      { emoji: "👍", count: 2, reactedByUser: false, nicknames: [] },
      { emoji: "❤️", count: 2, reactedByUser: false, nicknames: [] },
    ];

    const sorted = sortReactions(reactions);
    const emojis = sorted.map((r) => r.emoji);
    const sortedAlphabetically = [...emojis].sort((a, b) =>
      a.localeCompare(b)
    );
    expect(emojis).toEqual(sortedAlphabetically);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const reactions: ReactionSummary[] = [
      { emoji: "👍", count: 1, reactedByUser: false, nicknames: [] },
      { emoji: "❤️", count: 5, reactedByUser: false, nicknames: [] },
    ];
    const original = [...reactions];
    sortReactions(reactions);
    expect(reactions).toEqual(original);
  });

  it("빈 배열을 반환한다", () => {
    expect(sortReactions([])).toEqual([]);
  });

  it("단일 요소 배열을 그대로 반환한다", () => {
    const reactions: ReactionSummary[] = [
      { emoji: "👍", count: 3, reactedByUser: true, nicknames: ["홍길동"] },
    ];
    expect(sortReactions(reactions)).toEqual(reactions);
  });
});

describe("summarizeReactions", () => {
  it("같은 이모지의 반응을 집계한다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: "홍길동" } },
      { emoji: "👍", user_id: "user-2", user: { nickname: "김철수" } },
      { emoji: "❤️", user_id: "user-1", user: { nickname: "홍길동" } },
    ];

    const result = summarizeReactions(rows, null);
    const thumbsUp = result.find((r) => r.emoji === "👍");
    const heart = result.find((r) => r.emoji === "❤️");

    expect(thumbsUp?.count).toBe(2);
    expect(heart?.count).toBe(1);
  });

  it("현재 사용자가 반응한 이모지에 reactedByUser를 true로 설정한다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: "홍길동" } },
      { emoji: "❤️", user_id: "user-2", user: { nickname: "김철수" } },
    ];

    const result = summarizeReactions(rows, "user-1");
    const thumbsUp = result.find((r) => r.emoji === "👍");
    const heart = result.find((r) => r.emoji === "❤️");

    expect(thumbsUp?.reactedByUser).toBe(true);
    expect(heart?.reactedByUser).toBe(false);
  });

  it("userId가 null이면 모든 reactedByUser가 false이다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: "홍길동" } },
    ];

    const result = summarizeReactions(rows, null);
    expect(result.every((r) => r.reactedByUser === false)).toBe(true);
  });

  it("닉네임 목록을 수집한다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: "홍길동" } },
      { emoji: "👍", user_id: "user-2", user: { nickname: "김철수" } },
    ];

    const result = summarizeReactions(rows, null);
    const thumbsUp = result.find((r) => r.emoji === "👍");

    expect(thumbsUp?.nicknames).toContain("홍길동");
    expect(thumbsUp?.nicknames).toContain("김철수");
  });

  it("닉네임이 null인 경우 nicknames에 포함하지 않는다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: null } },
      { emoji: "👍", user_id: "user-2", user: { nickname: "김철수" } },
    ];

    const result = summarizeReactions(rows, null);
    const thumbsUp = result.find((r) => r.emoji === "👍");

    expect(thumbsUp?.nicknames).toEqual(["김철수"]);
    expect(thumbsUp?.count).toBe(2);
  });

  it("닉네임이 공백만 있는 경우 nicknames에 포함하지 않는다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: "   " } },
    ];

    const result = summarizeReactions(rows, null);
    const thumbsUp = result.find((r) => r.emoji === "👍");
    expect(thumbsUp?.nicknames).toEqual([]);
  });

  it("같은 사용자가 동일 이모지를 중복 반응해도 닉네임을 한 번만 수집한다", () => {
    const rows = [
      { emoji: "👍", user_id: "user-1", user: { nickname: "홍길동" } },
      { emoji: "👍", user_id: "user-1", user: { nickname: "홍길동" } },
    ];

    const result = summarizeReactions(rows, null);
    const thumbsUp = result.find((r) => r.emoji === "👍");
    expect(thumbsUp?.nicknames.filter((n) => n === "홍길동")).toHaveLength(1);
  });

  it("빈 배열을 입력하면 빈 배열을 반환한다", () => {
    expect(summarizeReactions([], null)).toEqual([]);
  });

  it("count가 높은 순서로 정렬된 결과를 반환한다", () => {
    const rows = [
      { emoji: "😂", user_id: "user-1", user: { nickname: "홍길동" } },
      { emoji: "❤️", user_id: "user-1", user: { nickname: "홍길동" } },
      { emoji: "❤️", user_id: "user-2", user: { nickname: "김철수" } },
      { emoji: "❤️", user_id: "user-3", user: { nickname: "이영희" } },
    ];

    const result = summarizeReactions(rows, null);
    expect(result[0].emoji).toBe("❤️");
    expect(result[0].count).toBe(3);
  });
});
