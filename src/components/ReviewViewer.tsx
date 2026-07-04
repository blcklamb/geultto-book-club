import "@/styles/tiptap.css";

import StarterKit from "@tiptap/starter-kit";
import { renderTiptapContent } from "./tiptap/renderTiptapContent";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { Strike } from "./editor-extension/strike";
import { JSONContent } from "@/lib/tiptap/type";

export interface ReviewViewerProps {
  content: JSONContent;
}
export const ReviewViewer = ({ content }: ReviewViewerProps) => {
  return (
    <>
      {renderTiptapContent({
        content,
        extensions: [
          StarterKit.configure({
            horizontalRule: false,
            bulletList: {
              keepMarks: true,
              HTMLAttributes: {
                class: "tiptap-bullet-list",
              },
            },
            orderedList: {
              keepMarks: true,
              HTMLAttributes: {
                class: "tiptap-ordered-list",
              },
            },
            listItem: {},
            strike: false,
          }),
          HorizontalRule,
          Image,
          Strike,
        ],
        rootClassName: "tiptap-editor",
        options: {
          unhandledMark: () => null,
          unhandledNode: () => null,
        },
      })}
    </>
  );
};
