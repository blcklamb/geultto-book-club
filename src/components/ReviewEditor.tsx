"use client";
import "@/styles/tiptap.css";

import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { ListItem, OrderedList, BulletList } from "./editor-extension/list";
import { Strike } from "./editor-extension/strike";
import { MIN_RICH_TEXT_CHARS, richTextMinCharsMessage } from "@/lib/rich-text";

type SubmitControl = HTMLButtonElement | HTMLInputElement;

const submitControlOriginalDisabled = new WeakMap<SubmitControl, boolean>();

type ReviewEditorProps = {
  name?: string;
  defaultContent?: JSONContent | string;
  placeholder?: string;
  entityName?: string;
  minChars?: number | null;
};

export function ReviewEditor({
  name = "contentRich",
  defaultContent,
  placeholder = "독후감을 작성해주세요…",
  entityName = "독후감",
  minChars = MIN_RICH_TEXT_CHARS,
}: ReviewEditorProps) {
  const [serializedContent, setSerializedContent] = useState(
    typeof defaultContent === "string"
      ? defaultContent
      : JSON.stringify(
          defaultContent ?? { type: "doc", content: [{ type: "paragraph" }] },
        ),
  );
  const [charCount, setCharCount] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const effectiveMinChars =
    typeof minChars === "number" && minChars > 0 ? minChars : null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        strike: false,
      }),
      HorizontalRule,
      Image,
      ListItem,
      OrderedList,
      BulletList,
      Strike,
      Placeholder.configure({ placeholder }),
    ],
    content: defaultContent ?? { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate({ editor }) {
      setSerializedContent(JSON.stringify(editor.getJSON()));
      setCharCount(editor.getText().length);
    },
  });

  useEffect(() => {
    if (!editor) return;
    setSerializedContent(JSON.stringify(editor.getJSON()));
    setCharCount(editor.getText().length);
  }, [editor]);

  // 최소 글자 수 미만이면 native form 제출과 submit 버튼을 함께 차단한다.
  useEffect(() => {
    if (!hiddenInputRef.current) return;
    if (effectiveMinChars === null) {
      hiddenInputRef.current.setCustomValidity("");
      return;
    }

    hiddenInputRef.current.setCustomValidity(
      charCount >= effectiveMinChars
        ? ""
        : richTextMinCharsMessage(entityName, charCount, effectiveMinChars),
    );
  }, [charCount, effectiveMinChars, entityName]);

  const isUnder = effectiveMinChars !== null && charCount < effectiveMinChars;

  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form || effectiveMinChars === null) return;

    const submitControls = Array.from(
      form.querySelectorAll<SubmitControl>(
        'button[type="submit"], input[type="submit"]',
      ),
    );

    submitControls.forEach((control) => {
      if (isUnder) {
        if (!submitControlOriginalDisabled.has(control)) {
          submitControlOriginalDisabled.set(control, control.disabled);
        }
        control.disabled = true;
        return;
      }

      if (submitControlOriginalDisabled.has(control)) {
        control.disabled =
          submitControlOriginalDisabled.get(control) ?? false;
        submitControlOriginalDisabled.delete(control);
      }
    });

    return () => {
      submitControls.forEach((control) => {
        if (!submitControlOriginalDisabled.has(control)) return;
        control.disabled =
          submitControlOriginalDisabled.get(control) ?? false;
        submitControlOriginalDisabled.delete(control);
      });
    };
  }, [effectiveMinChars, isUnder]);

  return (
    <>
      <EditorContent editor={editor} className="prose max-w-none rounded-md border border-slate-200 p-3" />
      {effectiveMinChars !== null ? (
        <p
          className={`mt-1 text-right text-xs ${isUnder ? "text-slate-400" : "text-emerald-600"}`}
        >
          {charCount.toLocaleString()} / {effectiveMinChars.toLocaleString()}자 이상
        </p>
      ) : null}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        value={serializedContent}
        readOnly
      />
    </>
  );
}
