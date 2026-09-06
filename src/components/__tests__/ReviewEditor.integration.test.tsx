import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { ReviewEditor } from "../ReviewEditor";

beforeAll(() => {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
});
// Use the real editor and ProseMirror keymap, not a useEditor mock.
function mount(
  content: object = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "첫 문장" }] },
    ],
  },
) {
  const result = render(
    <form>
      <ReviewEditor minChars={null} defaultContent={content} />
      <button type="submit">저장</button>
    </form>,
  );
  return result;
}
async function cursorAtEnd(el: HTMLElement) {
  (el.closest("[contenteditable=true]") as HTMLElement).focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
}

describe("real editor Enter", () => {
  it("splits a paragraph on Enter and saves both paragraphs", async () => {
    const { container } = mount();
    const editor = await screen.findByRole("textbox", { name: "독후감 본문" });
    await cursorAtEnd(editor);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", keyCode: 13 });
    await waitFor(() => expect(editor.querySelectorAll("p")).toHaveLength(2));
    fireEvent.blur(editor);
    const content = JSON.parse(
      (container.querySelector('input[name="contentRich"]') as HTMLInputElement)
        .value,
    );
    expect(content.content.map((n: { type: string }) => n.type)).toEqual([
      "paragraph",
      "paragraph",
    ]);
  });
  it("keeps Shift+Enter as a hard break inside the paragraph", async () => {
    mount();
    const editor = await screen.findByRole("textbox");
    await cursorAtEnd(editor);
    fireEvent.keyDown(editor, {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      shiftKey: true,
    });
    expect(editor.querySelectorAll("p")).toHaveLength(1);
    expect(editor.querySelector("br")).not.toBeNull();
  });
  it("does not split while an IME composition is active", async () => {
    mount();
    const editor = await screen.findByRole("textbox");
    await cursorAtEnd(editor);
    fireEvent.compositionStart(editor);
    fireEvent.keyDown(editor, {
      key: "Enter",
      code: "Enter",
      keyCode: 229,
      isComposing: true,
    });
    expect(editor.querySelectorAll("p")).toHaveLength(1);
    fireEvent.compositionEnd(editor);
  });
  it("creates a list item and exits an empty list item", async () => {
    mount({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "항목" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const editor = await screen.findByRole("textbox");
    await cursorAtEnd(editor.querySelector("li p")!);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", keyCode: 13 });
    expect(editor.querySelectorAll("li")).toHaveLength(2);
    await cursorAtEnd(editor.querySelector("li:last-child p")!);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", keyCode: 13 });
    expect(editor.querySelectorAll("li")).toHaveLength(1);
    expect(editor.lastElementChild?.tagName).toBe("P");
  });
  it("supports paragraph splitting beside an image", async () => {
    mount({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://example.test/image.png" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "이미지 다음 문장" }],
        },
      ],
    });
    const editor = await screen.findByRole("textbox");
    await cursorAtEnd(editor.querySelector("p")!);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", keyCode: 13 });
    expect(editor.querySelector("img")).not.toBeNull();
    expect(editor.querySelectorAll("p")).toHaveLength(2);
  });
  it("keeps Enter available inside a blockquote", async () => {
    mount({
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "인용문" }] },
          ],
        },
      ],
    });
    const editor = await screen.findByRole("textbox");
    await cursorAtEnd(editor.querySelector("blockquote p")!);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", keyCode: 13 });
    expect(editor.querySelectorAll("blockquote p")).toHaveLength(2);
  });
});
