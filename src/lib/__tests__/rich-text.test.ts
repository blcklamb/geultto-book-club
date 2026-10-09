import { describe, expect, it } from "vitest";
import { extractPlainText } from "../rich-text";

describe("review plain text serialization", () => {
  it("preserves spaces, paragraph separators, and hard breaks", () => {
    expect(extractPlainText({ type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "첫 문장 " }] },
      { type: "paragraph", content: [
        { type: "text", text: "다음" },
        { type: "hardBreak" },
        { type: "text", text: "줄" },
      ] },
    ] })).toBe("첫 문장 \n\n다음\n줄");
  });

  it("matches Tiptap separators for nested lists and blockquotes", () => {
    expect(extractPlainText({ type: "doc", content: [
      { type: "blockquote", content: [
        { type: "paragraph", content: [{ type: "text", text: "인용" }] },
      ] },
      { type: "bulletList", content: [{ type: "listItem", content: [
        { type: "paragraph", content: [{ type: "text", text: "항목" }] },
      ] }] },
    ] })).toBe("\n\n인용\n\n\n\n\n\n항목");
  });

  it("counts neither formatting nor image attributes as text", () => {
    expect(extractPlainText({ type: "doc", content: [
      { type: "image", attrs: { src: "https://example.test/image.png", alt: "설명" } },
      { type: "paragraph", content: [
        { type: "text", text: "강조", marks: [{ type: "bold" }, { type: "italic" }] },
      ] },
    ] })).toBe("\n\n강조");
  });

  it("returns empty text for an empty document", () => {
    expect(extractPlainText({ type: "doc", content: [{ type: "paragraph" }] })).toBe("");
  });
});
