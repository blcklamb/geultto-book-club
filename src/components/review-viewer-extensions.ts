import StarterKit from "@tiptap/starter-kit";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { Strike } from "./editor-extension/strike";
import { ReviewHighlightMark } from "./editor-extension/highlight";

// Only import from the server renderer or the deferred interactive viewer.
export function reviewViewerExtensions() {
  return [
    StarterKit.configure({
      horizontalRule: false,
      bulletList: { keepMarks: true, HTMLAttributes: { class: "tiptap-bullet-list" } },
      orderedList: { keepMarks: true, HTMLAttributes: { class: "tiptap-ordered-list" } },
      listItem: {},
      strike: false,
    }),
    HorizontalRule,
    Image,
    Strike,
    ReviewHighlightMark.configure({
      multicolor: true,
      HTMLAttributes: { class: "cursor-pointer rounded-sm" },
    }),
  ];
}
