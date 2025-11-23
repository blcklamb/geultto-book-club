"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function ReviewEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>독후감을 작성해주세요…</p>",
  });
  return <EditorContent editor={editor} className="prose max-w-none" />;
}
