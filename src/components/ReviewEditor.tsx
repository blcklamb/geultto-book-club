"use client";
import "@/styles/tiptap.css";

import { useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { ListItem, OrderedList, BulletList } from "./editor-extension/list";
import { Strike } from "./editor-extension/strike";

type ReviewEditorProps = {
  name?: string;
  defaultContent?: JSONContent | string;
};

export function ReviewEditor({
  name = "contentRich",
  defaultContent,
}: ReviewEditorProps) {
  const [serializedContent, setSerializedContent] = useState(
    typeof defaultContent === "string"
      ? defaultContent
      : JSON.stringify(
          defaultContent ?? { type: "doc", content: [{ type: "paragraph" }] }
        )
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      HorizontalRule,
      Image,
      ListItem,
      OrderedList,
      BulletList,
      Strike,
    ],
    content: defaultContent ?? "<p>독후감을 작성해주세요…</p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate({ editor }) {
      setSerializedContent(JSON.stringify(editor.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    setSerializedContent(JSON.stringify(editor.getJSON()));
  }, [editor]);

  return (
    <>
      <EditorContent editor={editor} className="prose max-w-none" />
      <input type="hidden" name={name} value={serializedContent} readOnly />
    </>
  );
}
