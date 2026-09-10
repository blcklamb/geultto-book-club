import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { SpellcheckDecorations } from "./index";

describe("SpellcheckDecorations with the Tiptap editor", () => {
  let editor: Editor | undefined;

  afterEach(() => {
    editor?.destroy();
    editor = undefined;
    document.body.replaceChildren();
  });

  it("mounts with placeholder decorations and renders and clears spelling marks", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    // Use a real view: mocking useEditor cannot exercise DecorationGroup rendering.
    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: "Write a review" }),
        SpellcheckDecorations,
      ],
      content: "<p></p>",
    });

    expect(element.querySelector("[data-placeholder]")).not.toBeNull();

    editor.commands.setContent("<p>hello</p>");
    editor.commands.setSpellcheckIssues([
      { id: "issue-1", from: 1, to: 6, label: "Spelling suggestion" },
    ]);
    expect(element.querySelector(".spellcheck-error")?.textContent).toBe("hello");

    editor.commands.clearSpellcheckIssues();
    expect(element.querySelector(".spellcheck-error")).toBeNull();
    expect(editor.getText()).toBe("hello");

    editor.commands.clearContent();
    expect(element.querySelector("[data-placeholder]")).not.toBeNull();
  });
});
