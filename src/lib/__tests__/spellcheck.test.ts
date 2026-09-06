import { describe, expect, it } from "vitest";
import { toSpellcheckIssues } from "../spellcheck";

describe("toSpellcheckIssues", () => {
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

  it("drops provider offsets that do not point to the original source", () => {
    const issues = toSpellcheckIssues("block-0", "맞춤법", {
      revised_blocks: [
        {
          origin: { content: "오류", begin_offset: 0, length: 2 },
          revised: "정정",
          revisions: [],
        },
      ],
    });

    expect(issues).toEqual([]);
  });
});
