import { describe, expect, it } from "vitest";
import { toSpellcheckIssues } from "../spellcheck";
import libraryReview from "./fixtures/bareun-library-review.json";

describe("toSpellcheckIssues", () => {
  it("retains every correction in the actual response for the reported review", () => {
    // Captured from Bareun CorrectError on 2026-09-10, using UTF16.
    const issues = toSpellcheckIssues("block-0", libraryReview.source, libraryReview.response);
    expect(issues).toHaveLength(libraryReview.response.revisedBlocks.length);
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(libraryReview.source.slice(issue.from, issue.to)).toBe(issue.original);
      expect(issue.explanation).toBeTruthy();
    }
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ original: expect.stringContaining("됬고"), suggestion: expect.stringContaining("됐고") }),
      expect.objectContaining({ original: expect.stringContaining("괜찬다"), suggestion: expect.stringContaining("괜찮다") }),
    ]));
  });
  it("converts a Bareun correction with its help text", () => {
    const issues = toSpellcheckIssues("block-0", "되서 못먹었어요", {
      revised_blocks: [
        {
          origin: { content: "되서", begin_offset: 0, length: 2 },
          revised: "돼서",
          revisions: [
            { revised: "돼서", category: "GRAMMER", help_id: "되다_돼다" },
          ],
        },
      ],
      helps: {
        되다_돼다: { comment: "'되어서'의 준말은 '돼서'입니다." },
      },
    });

    expect(issues).toEqual([
      expect.objectContaining({
        blockId: "block-0",
        from: 0,
        to: 2,
        original: "되서",
        suggestion: "돼서",
        category: "GRAMMER",
        explanation: "'되어서'의 준말은 '돼서'입니다.",
      }),
    ]);
  });

  it("keeps only the outermost correction when provider ranges overlap", () => {
    const issues = toSpellcheckIssues("block-0", "아무도도와", {
      revised_blocks: [
        {
          origin: { content: "아무도도와", begin_offset: 0, length: 5 },
          revised: "아무도 도와",
          revisions: [],
        },
        {
          origin: { content: "도도", begin_offset: 2, length: 2 },
          revised: "도 도",
          revisions: [],
        },
      ],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ original: "아무도도와" });
  });

  it("reports invalid provider offsets instead of returning no errors", () => {
    expect(() => toSpellcheckIssues("block-0", "맞춤법", {
      revised_blocks: [
        {
          origin: { content: "오류", begin_offset: 0, length: 2 },
          revised: "정정",
          revisions: [],
        },
      ],
    })).toThrow("provider_invalid_response");
  });

  it("accepts Connect JSON camelCase fields and omitted zero offsets", () => {
    const source = "됬고 괜찬다";
    const issues = toSpellcheckIssues("block-0", source, {
      revisedBlocks: [
        { origin: { content: "됬고", length: 2 }, revised: "됐고",
          revisions: [{ category: "GRAMMER", helpId: "contraction" }] },
        { origin: { content: "괜찬다", beginOffset: 3, length: 3 }, revised: "괜찮다" },
      ],
      helps: { contraction: { comment: "되어의 준말은 돼입니다." } },
    });
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({ from: 0, to: 2, explanation: "되어의 준말은 돼입니다." });
    expect(issues[1]).toMatchObject({ from: 3, to: 6, suggestion: "괜찮다" });
  });

  it("preserves UTF-16 offsets after emoji", () => {
    expect(toSpellcheckIssues("b", "📚 괜찬다", {
      revisedBlocks: [{ origin: { content: "괜찬다", beginOffset: 3, length: 3 }, revised: "괜찮다" }],
    })[0]).toMatchObject({ from: 3, to: 6 });
  });

  it.each([
    { revisedBlocks: [] },
    { revised_blocks: [] },
    { origin: "안녕하세요.", revised: "안녕하세요." },
  ])("accepts an explicit clean response: %j", (response) => {
    expect(toSpellcheckIssues("b", "안녕하세요.", response)).toEqual([]);
  });

  it.each([
    null, {}, { error: "upstream failure" }, { revisedBlocks: {} },
    { revisedBlocks: [null] }, { revisedBlocks: [{}] },
    { origin: "됬고", revised: "됐고" },
    { revisedBlocks: [], revised: "됐고" },
  ])("rejects malformed or lost corrections: %j", (response) => {
    expect(() => toSpellcheckIssues("b", "됬고", response)).toThrow("provider_invalid_response");
  });
});
