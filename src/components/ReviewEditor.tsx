"use client";
import "@/styles/tiptap.css";

import { useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { Strike } from "./editor-extension/strike";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { MIN_RICH_TEXT_CHARS, richTextMinCharsMessage } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type SubmitControl = HTMLButtonElement | HTMLInputElement;

const submitControlOriginalDisabled = new WeakMap<SubmitControl, boolean>();

type ToolbarButton = {
  label: string;
  icon: LucideIcon;
  command: (editor: Editor) => void;
  canRun: (editor: Editor) => boolean;
  isActive?: (editor: Editor) => boolean;
};

const toolbarGroups: ToolbarButton[][] = [
  [
    {
      label: "실행 취소",
      icon: Undo2,
      command: (editor) => editor.chain().focus().undo().run(),
      canRun: (editor) => editor.can().chain().focus().undo().run(),
    },
    {
      label: "다시 실행",
      icon: Redo2,
      command: (editor) => editor.chain().focus().redo().run(),
      canRun: (editor) => editor.can().chain().focus().redo().run(),
    },
  ],
  [
    {
      label: "굵게",
      icon: Bold,
      command: (editor) => editor.chain().focus().toggleBold().run(),
      canRun: (editor) => editor.can().chain().focus().toggleBold().run(),
      isActive: (editor) => editor.isActive("bold"),
    },
    {
      label: "기울임",
      icon: Italic,
      command: (editor) => editor.chain().focus().toggleItalic().run(),
      canRun: (editor) => editor.can().chain().focus().toggleItalic().run(),
      isActive: (editor) => editor.isActive("italic"),
    },
    {
      label: "취소선",
      icon: Strikethrough,
      command: (editor) => editor.chain().focus().toggleStrike().run(),
      canRun: (editor) => editor.can().chain().focus().toggleStrike().run(),
      isActive: (editor) => editor.isActive("strike"),
    },
  ],
  [
    {
      label: "제목 2",
      icon: Heading2,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      canRun: (editor) =>
        editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
    },
    {
      label: "제목 3",
      icon: Heading3,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      canRun: (editor) =>
        editor.can().chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
    },
    {
      label: "인용",
      icon: Quote,
      command: (editor) => editor.chain().focus().toggleBlockquote().run(),
      canRun: (editor) =>
        editor.can().chain().focus().toggleBlockquote().run(),
      isActive: (editor) => editor.isActive("blockquote"),
    },
  ],
  [
    {
      label: "불렛 목록",
      icon: List,
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
      canRun: (editor) =>
        editor.can().chain().focus().toggleBulletList().run(),
      isActive: (editor) => editor.isActive("bulletList"),
    },
    {
      label: "번호 목록",
      icon: ListOrdered,
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
      canRun: (editor) =>
        editor.can().chain().focus().toggleOrderedList().run(),
      isActive: (editor) => editor.isActive("orderedList"),
    },
    {
      label: "구분선",
      icon: Minus,
      command: (editor) => editor.chain().focus().setHorizontalRule().run(),
      canRun: (editor) =>
        editor.can().chain().focus().setHorizontalRule().run(),
    },
    {
      label: "서식 지우기",
      icon: Eraser,
      command: (editor) =>
        editor.chain().focus().unsetAllMarks().clearNodes().run(),
      canRun: (editor) =>
        editor.can().chain().focus().unsetAllMarks().clearNodes().run(),
    },
  ],
];

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2"
        role="toolbar"
        aria-label="에디터 도구 모음"
      >
        {toolbarGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className="flex items-center gap-1 border-r border-slate-200 pr-1 last:border-r-0 last:pr-0"
          >
            {group.map((item) => {
              const Icon = item.icon;
              const active = item.isActive?.(editor) ?? false;
              const disabled = !item.canRun(editor);

              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-md text-slate-600 hover:bg-white hover:text-slate-900",
                        active &&
                          "bg-slate-900 text-white hover:bg-slate-800 hover:text-white",
                      )}
                      aria-label={item.label}
                      aria-pressed={item.isActive ? active : undefined}
                      disabled={disabled}
                      onClick={() => item.command(editor)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

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
      Placeholder.configure({ placeholder }),
    ],
    content: defaultContent ?? { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor tiptap-editor-editable",
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
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} className="prose max-w-none" />
        {effectiveMinChars !== null ? (
          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
            <p
              className={`text-right text-xs ${isUnder ? "text-slate-400" : "text-emerald-600"}`}
            >
              {charCount.toLocaleString()} /{" "}
              {effectiveMinChars.toLocaleString()}자 이상
            </p>
          </div>
        ) : null}
      </div>
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
