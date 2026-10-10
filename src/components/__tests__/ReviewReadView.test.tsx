import { describe, it, expect, vi } from "vitest";
vi.mock("../ReviewViewerLazy", () => ({ ReviewViewerLazy: ({ children }: { children: React.ReactNode }) => children }));
import { render } from "@testing-library/react";
import { getSchema, type JSONContent } from "@tiptap/core";
import { renderReviewReadContent } from "../ReviewReadView";
import { reviewViewerExtensions } from "../review-viewer-extensions";
import { reviewPositionAtDOM, captureReviewSelection } from "@/lib/review-selection";
import type { HighlightWithComments } from "@/lib/highlight";

const content: JSONContent = {
  type: "doc", content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "한글 😀 제목" }] },
    { type: "paragraph", content: [
      { type: "text", text: "굵은 글씨", marks: [{ type: "bold" }] },
      { type: "hardBreak" }, { type: "text", text: "다음 줄", marks: [{ type: "italic" }] },
    ] },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "목록 구절" }] }] }] },
    { type: "image", attrs: { src: "/test.png", alt: "사진" } },
    { type: "paragraph" },
    { type: "horizontalRule" },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "인용문" }] }] },
    { type: "codeBlock", content: [{ type: "text", text: "const a = 1;" }] },
  ],
};
const highlight = (id: string, startPos: number, endPos: number): HighlightWithComments => ({
  id, startPos, endPos, highlightText: "구절", authorId: "u1", authorNickname: "회원", comments: [],
});

describe("server reading view and selection positions", () => {
  it("renders formatting, images and overlapping highlights without an editor", () => {
    const { body } = renderReviewReadContent(content, [highlight("h1", 1, 6), highlight("h2", 3, 8)]);
    const { container } = render(body);
    expect(container.querySelector(".ProseMirror")).toBeNull();
    expect(container.querySelector("h2")?.textContent).toBe("한글 😀 제목");
    expect(container.querySelector("strong")?.textContent).toBe("굵은 글씨");
    expect(container.querySelector("li")?.textContent).toBe("목록 구절");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("사진");
    expect(container.querySelector('[data-highlight-id="h1"] [data-highlight-id="h2"], [data-highlight-id="h2"] [data-highlight-id="h1"]')).not.toBeNull();
    const remaining = render(renderReviewReadContent(content, [highlight("h2", 3, 8)]).body).container;
    expect(remaining.querySelector('[data-highlight-id="h1"]')).toBeNull();
    expect(remaining.querySelector('[data-highlight-id="h2"]')).not.toBeNull();
  });
  it("matches the document's UTF-16 positions for every text character, including split marks", () => {
    const doc = getSchema(reviewViewerExtensions()).nodeFromJSON(content);
    const { container } = render(renderReviewReadContent(content, [highlight("h1", 1, 6), highlight("h2", 3, 8)]).body);
    for (const span of container.querySelectorAll<HTMLElement>("[data-pm-text]")) {
      const text = span.firstChild!;
      const start = Number(span.dataset.pmStart);
      expect(doc.textBetween(start, start + text.textContent!.length)).toBe(text.textContent);
      for (let offset = 0; offset <= text.textContent!.length; offset++) {
        expect(reviewPositionAtDOM(container, text, offset)).toBe(start + offset);
      }
    }
  });
  it("preserves reverse selections across paragraphs and excludes outside selections", () => {
    const { container } = render(renderReviewReadContent(content, []).body);
    const spans = container.querySelectorAll<HTMLElement>("[data-pm-text]");
    const start = spans[0].firstChild!;
    const end = spans[3].firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(end, 2, start, 1);
    const captured = captureReviewSelection(container, selection)!;
    expect(captured.anchor).toBe(Number(spans[3].dataset.pmStart) + 2);
    expect(captured.head).toBe(Number(spans[0].dataset.pmStart) + 1);
    expect(captured.anchor).toBeGreaterThan(captured.head);
    expect(captureReviewSelection(document.createElement("div"), selection)).toBeNull();
    selection.removeAllRanges();
  });
  it("maps element boundaries, empty paragraphs, line breaks and images", () => {
    const { container } = render(renderReviewReadContent(content, []).body);
    const paragraph = container.querySelector("p")!;
    const br = paragraph.querySelector("br")!;
    const img = container.querySelector("img")!;
    expect(reviewPositionAtDOM(container, paragraph, 1)).toBe(Number(br.dataset.pmStart));
    expect(reviewPositionAtDOM(container, paragraph, paragraph.childNodes.length)).toBe(Number(paragraph.querySelectorAll<HTMLElement>("[data-pm-text]")[1].dataset.pmEnd));
    expect(reviewPositionAtDOM(container, img, 0)).toBe(Number(img.dataset.pmStart));
    const empty = Array.from(container.querySelectorAll("p")).find(p => !p.childNodes.length)!;
    expect(reviewPositionAtDOM(container, empty, 0)).toBe(Number(empty.dataset.pmStart) + 1);
  });
  it("ignores stale invalid highlight ranges without hiding the body", () => {
    const { container } = render(renderReviewReadContent(content, [highlight("negative", -1, 2), highlight("past-end", 1, 9999)]).body);
    expect(container.textContent).toContain("한글 😀 제목");
    expect(container.querySelector("mark")).toBeNull();
  });
});
