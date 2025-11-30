import "@/styles/tiptap.css";

import StarterKit from "@tiptap/starter-kit";
import { renderTiptapContent } from "./tiptap/renderTiptapContent";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { ListItem, OrderedList, BulletList } from "./editor-extension/list";
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
          StarterKit,
          HorizontalRule,
          Image,
          ListItem,
          OrderedList,
          BulletList,
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
