"use client";
import "@/styles/tiptap.css";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { SelectionBookmark } from "@tiptap/pm/state";
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
  SpellCheck,
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
import { ImageAttachments } from "./ImageAttachments";
import { useImageUploads } from "@/hooks/useImageUploads";
import { MAX_POST_IMAGE_COUNT } from "@/lib/content-images";
import { cn } from "@/lib/utils";
import {
  type SpellcheckIssue,
  type SpellcheckSegment,
} from "@/lib/spellcheck";
import {
  SpellcheckDecorations,
  type SpellcheckDecorationIssue,
} from "./editor-extension/spellcheck";

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

function EditorToolbar({
  editor,
  spellcheckEnabled = false,
  isSpellchecking = false,
  onSpellcheck,
}: {
  editor: Editor | null;
  spellcheckEnabled?: boolean;
  isSpellchecking?: boolean;
  onSpellcheck?: () => void;
}) {
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
        {spellcheckEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-1 h-8 gap-1.5 bg-white text-slate-700"
            disabled={isSpellchecking}
            onClick={onSpellcheck}
          >
            <SpellCheck className="h-4 w-4" />
            {isSpellchecking ? "검사 중…" : "맞춤법 검사하기"}
          </Button>
        ) : null}
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
  spellcheckEnabled?: boolean;
  spellcheckReviewId?: string;
};

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function parseInitialContent(defaultContent?: JSONContent | string): JSONContent {
  if (!defaultContent) return EMPTY_DOC;
  if (typeof defaultContent !== "string") return defaultContent;

  try {
    return JSON.parse(defaultContent);
  } catch {
    return EMPTY_DOC;
  }
}

type SpellcheckSegmentMapping = {
  segment: SpellcheckSegment;
  positions: number[];
};

type EditorSpellcheckIssue = Omit<SpellcheckIssue, "from" | "to"> & {
  from: number;
  to: number;
};

type ActiveSpellcheckIssue = {
  id: string;
  anchor: DOMRect;
};

function buildSpellcheckSegments(editor: Editor): SpellcheckSegmentMapping[] {
  const segments: SpellcheckSegmentMapping[] = [];
  let blockIndex = 0;

  editor.state.doc.descendants((node, blockPosition) => {
    if (!node.isTextblock) return true;

    let text = "";
    const positions: number[] = [];
    node.descendants((child, offset) => {
      const docPosition = blockPosition + 1 + offset;
      if (child.isText) {
        const content = child.text ?? "";
        const sourceStart = text.length;
        for (let index = 0; index <= content.length; index += 1) {
          positions[sourceStart + index] = docPosition + index;
        }
        text += content;
        return false;
      }

      if (child.type.name === "hardBreak") {
        const sourceStart = text.length;
        positions[sourceStart] = docPosition;
        positions[sourceStart + 1] = docPosition + 1;
        text += "\n";
        return false;
      }

      return true;
    });

    if (text.trim()) {
      segments.push({
        segment: { id: `block-${blockIndex}`, text },
        positions,
      });
      blockIndex += 1;
    }
    return true;
  });

  return segments;
}

function mapSpellcheckIssues(
  mappings: SpellcheckSegmentMapping[],
  issues: SpellcheckIssue[],
): EditorSpellcheckIssue[] {
  const mappingById = new Map(
    mappings.map((mapping) => [mapping.segment.id, mapping]),
  );

  return issues.flatMap((issue) => {
    const mapping = mappingById.get(issue.blockId);
    if (!mapping) return [];
    const from = mapping.positions[issue.from];
    const to = mapping.positions[issue.to];
    if (
      typeof from !== "number" ||
      typeof to !== "number" ||
      from >= to
    ) {
      return [];
    }
    return [{ ...issue, from, to }];
  });
}

function isSpellcheckIssue(value: unknown): value is SpellcheckIssue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const issue = value as Record<string, unknown>;
  return (
    typeof issue.id === "string" &&
    typeof issue.blockId === "string" &&
    typeof issue.from === "number" &&
    typeof issue.to === "number" &&
    typeof issue.original === "string" &&
    typeof issue.suggestion === "string" &&
    typeof issue.category === "string" &&
    (typeof issue.explanation === "string" || issue.explanation === null)
  );
}

function SpellcheckPopover({
  issue,
  anchor,
  onApply,
  onIgnore,
  onClose,
}: {
  issue: EditorSpellcheckIssue;
  anchor: DOMRect;
  onApply: () => void;
  onIgnore: () => void;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || contentRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      role="dialog"
      aria-label="맞춤법 변경 제안"
      className="fixed z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl"
      style={{ left: Math.max(8, anchor.left), top: anchor.bottom + 8 }}
    >
      <p className="text-xs font-medium text-slate-500">{issue.category}</p>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <span className="text-slate-400">원문</span>
        <span className="break-words line-through decoration-rose-400">
          {issue.original}
        </span>
        <span className="text-slate-400">제안</span>
        <span className="break-words font-medium text-emerald-700">
          {issue.suggestion}
        </span>
      </div>
      {issue.explanation ? (
        <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500">
          {issue.explanation}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onIgnore}>
          무시
        </Button>
        <Button type="button" size="sm" onClick={onApply}>
          변경 적용
        </Button>
      </div>
    </div>,
    document.body,
  );
}

export function ReviewEditor({
  name = "contentRich",
  defaultContent,
  placeholder = "독후감을 작성해주세요…",
  entityName = "독후감",
  minChars = MIN_RICH_TEXT_CHARS,
  spellcheckEnabled = false,
  spellcheckReviewId,
}: ReviewEditorProps) {
  const initialContent = useMemo<JSONContent>(
    () => parseInitialContent(defaultContent),
    [defaultContent],
  );
  const initialSerializedContent = useMemo(
    () => JSON.stringify(initialContent),
    [initialContent],
  );
  const [charCount, setCharCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const effectiveMinChars =
    typeof minChars === "number" && minChars > 0 ? minChars : null;
  const latestEditorRef = useRef<Editor | null>(null);
  const imageBookmarks = useRef(new Map<string, SelectionBookmark>());
  const uploads = useImageUploads({
    maxItems: (items) => {
      let imageCount = 0;
      latestEditorRef.current?.state.doc.descendants((node) => {
        if (node.type.name === "image") imageCount += 1;
      });
      const uploadedCount = items.filter(
        (item) => item.status === "done",
      ).length;
      return Math.max(0, MAX_POST_IMAGE_COUNT - imageCount + uploadedCount);
    },
    onAdded: (id) => {
      const selection = latestEditorRef.current?.state.selection;
      if (selection) imageBookmarks.current.set(id, selection.getBookmark());
    },
    onRemoved: (item) => {
      imageBookmarks.current.delete(item.id);
      const activeEditor = latestEditorRef.current;
      if (!item.url || !activeEditor || activeEditor.isDestroyed) return;
      let imagePosition: number | null = null;
      let imageNodeSize = 0;
      activeEditor.state.doc.descendants((node, position) => {
        if (node.type.name === "image" && node.attrs.src === item.url) {
          imagePosition = position;
          imageNodeSize = node.nodeSize;
          return false;
        }
      });
      if (imagePosition === null) return;
      activeEditor.view.dispatch(
        activeEditor.state.tr.delete(
          imagePosition,
          imagePosition + imageNodeSize,
        ),
      );
      flushSerializedContent(activeEditor);
    },
    onUploaded: ({ url }, id) => {
      const activeEditor = latestEditorRef.current;
      if (!activeEditor || activeEditor.isDestroyed) return;
      const bookmark = imageBookmarks.current.get(id);
      imageBookmarks.current.delete(id);
      if (bookmark) {
        const selection = bookmark.resolve(activeEditor.state.doc);
        activeEditor.view.dispatch(
          activeEditor.state.tr.setSelection(selection),
        );
      }
      activeEditor.chain().focus().setImage({ src: url }).run();
      flushSerializedContent(activeEditor);
    },
  });
  const uploadBlockedRef = useRef(uploads.isBlocked);
  uploadBlockedRef.current = uploads.isBlocked;
  const serializeTimerRef = useRef<number | null>(null);
  const [spellcheckIssues, setSpellcheckIssues] = useState<
    EditorSpellcheckIssue[]
  >([]);
  const [isSpellchecking, setIsSpellchecking] = useState(false);
  const [spellcheckMessage, setSpellcheckMessage] = useState<string | null>(
    null,
  );
  const [activeSpellcheckIssue, setActiveSpellcheckIssue] =
    useState<ActiveSpellcheckIssue | null>(null);

  const flushSerializedContent = (editorInstance?: Editor | null) => {
    const nextEditor = editorInstance ?? latestEditorRef.current;
    if (!nextEditor || !hiddenInputRef.current) return;
    hiddenInputRef.current.value = JSON.stringify(nextEditor.getJSON());
  };

  const scheduleSerializedContent = (editorInstance: Editor) => {
    latestEditorRef.current = editorInstance;
    if (serializeTimerRef.current != null) {
      window.clearTimeout(serializeTimerRef.current);
    }
    serializeTimerRef.current = window.setTimeout(() => {
      flushSerializedContent(editorInstance);
      serializeTimerRef.current = null;
    }, 180);
  };

  const syncEditorMetadata = (editorInstance: Editor) => {
    let nextImageCount = 0;
    editorInstance.state.doc.descendants((node) => {
      if (node.type.name === "image") nextImageCount += 1;
    });
    setImageCount(nextImageCount);
    const nextCharCount = editorInstance.getText().length;
    startTransition(() => {
      setCharCount((prev) => (prev === nextCharCount ? prev : nextCharCount));
    });
    scheduleSerializedContent(editorInstance);
  };

  const extensions = useMemo(
    () => [
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
      ...(spellcheckEnabled ? [SpellcheckDecorations] : []),
    ],
    [placeholder, spellcheckEnabled],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor tiptap-editor-editable",
        role: "textbox",
        "aria-label": `${entityName} 본문`,
        "aria-multiline": "true",
      },
    },
    onTransaction({ transaction }) {
      for (const [id, bookmark] of imageBookmarks.current) {
        imageBookmarks.current.set(id, bookmark.map(transaction.mapping));
      }
    },
    onUpdate({ editor }) {
      setActiveSpellcheckIssue(null);
      syncEditorMetadata(editor);
    },
    onBlur({ editor }) {
      flushSerializedContent(editor);
    },
  });

  const runSpellcheck = async () => {
    if (!editor || isSpellchecking) return;
    if (!spellcheckReviewId) {
      setSpellcheckMessage("독후감 식별 정보를 찾지 못했습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }

    const mappings = buildSpellcheckSegments(editor);
    if (mappings.length === 0) {
      editor.commands.clearSpellcheckIssues();
      setSpellcheckIssues([]);
      setActiveSpellcheckIssue(null);
      setSpellcheckMessage("검사할 본문이 없습니다.");
      return;
    }

    setIsSpellchecking(true);
    setSpellcheckMessage(null);
    setActiveSpellcheckIssue(null);
    try {
      const response = await fetch("/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: spellcheckReviewId,
          segments: mappings.map((mapping) => mapping.segment),
        }),
      });
      const data: unknown = await response.json();
      const record =
        data !== null && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : null;
      if (!response.ok) {
        throw new Error(
          typeof record?.error === "string"
            ? record.error
            : "맞춤법 검사에 실패했습니다. 다시 시도해주세요.",
        );
      }

      const responseIssues = Array.isArray(record?.issues)
        ? record.issues.filter(isSpellcheckIssue)
        : null;
      if (!responseIssues) {
        throw new Error("맞춤법 검사 결과를 읽지 못했습니다. 다시 시도해주세요.");
      }

      const mappedIssues = mapSpellcheckIssues(mappings, responseIssues);
      editor.commands.setSpellcheckIssues(
        mappedIssues.map(
          (issue): SpellcheckDecorationIssue => ({
            id: issue.id,
            from: issue.from,
            to: issue.to,
            label: `${issue.original}: ${issue.suggestion}으로 변경 제안`,
          }),
        ),
      );
      setSpellcheckIssues(mappedIssues);
      setSpellcheckMessage(
        mappedIssues.length > 0
          ? `${mappedIssues.length}개의 맞춤법 제안을 찾았습니다.`
          : "맞춤법 오류를 찾지 못했습니다.",
      );
    } catch (error) {
      setSpellcheckMessage(
        error instanceof Error
          ? error.message
          : "맞춤법 검사에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsSpellchecking(false);
    }
  };

  const activateSpellcheckIssue = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const marker = target.closest<HTMLElement>("[data-spellcheck-id]");
    const id = marker?.dataset.spellcheckId;
    if (!marker || !id) return;
    if (!spellcheckIssues.some((issue) => issue.id === id)) return;
    setActiveSpellcheckIssue({ id, anchor: marker.getBoundingClientRect() });
  };

  const activeIssue = activeSpellcheckIssue
    ? spellcheckIssues.find((issue) => issue.id === activeSpellcheckIssue.id) ??
      null
    : null;

  const ignoreSpellcheckIssue = (id: string) => {
    editor?.commands.removeSpellcheckIssue(id);
    setSpellcheckIssues((issues) => issues.filter((issue) => issue.id !== id));
    setActiveSpellcheckIssue(null);
  };

  const applySpellcheckIssue = (issue: EditorSpellcheckIssue) => {
    if (!editor) return;
    const currentText = editor.state.doc.textBetween(issue.from, issue.to, "");
    if (currentText !== issue.original) {
      ignoreSpellcheckIssue(issue.id);
      setSpellcheckMessage("본문이 변경되어 이 제안을 적용할 수 없습니다. 다시 검사해주세요.");
      return;
    }

    editor.view.dispatch(
      editor.state.tr.insertText(issue.suggestion, issue.from, issue.to),
    );
    ignoreSpellcheckIssue(issue.id);
  };

  useEffect(() => {
    if (!editor) return;
    latestEditorRef.current = editor;
    syncEditorMetadata(editor);

    const form = hiddenInputRef.current?.form;
    if (!form) return;

    const handleSubmit = (event: SubmitEvent) => {
      flushSerializedContent(editor);
      let count = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "image") count += 1;
      });
      if (count > MAX_POST_IMAGE_COUNT || uploadBlockedRef.current()) {
        event.preventDefault();
        return;
      }
      if (effectiveMinChars === null) {
        uploads.clear({ preserveUploaded: true });
        return;
      }

      const latestCharCount = editor.getText().length;
      if (latestCharCount >= effectiveMinChars) {
        uploads.clear({ preserveUploaded: true });
        return;
      }

      event.preventDefault();
      hiddenInputRef.current?.setCustomValidity(
        richTextMinCharsMessage(
          entityName,
          latestCharCount,
          effectiveMinChars,
        ),
      );
      setCharCount(latestCharCount);
      editor.commands.focus();
    };
    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, [editor, effectiveMinChars, entityName]);

  useEffect(() => {
    return () => {
      if (serializeTimerRef.current != null) {
        window.clearTimeout(serializeTimerRef.current);
      }
    };
  }, []);

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

  const isUnder =
    imageCount > MAX_POST_IMAGE_COUNT ||
    uploads.blocked ||
    (effectiveMinChars !== null && charCount < effectiveMinChars);

  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) return;

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
        <EditorToolbar
          editor={editor}
          spellcheckEnabled={spellcheckEnabled}
          isSpellchecking={isSpellchecking}
          onSpellcheck={runSpellcheck}
        />
        {imageCount > MAX_POST_IMAGE_COUNT ? (
          <p role="alert" className="px-3 py-2 text-sm text-red-600">
            본문 이미지는 최대 3개까지 첨부할 수 있습니다. 초과한 이미지를 제거해주세요.
          </p>
        ) : null}
        <ImageAttachments
          uploads={uploads}
          maxImages={MAX_POST_IMAGE_COUNT}
          onFileDrop={(event) => {
            if (!editor) return;
            const position = editor.view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (position) editor.commands.setTextSelection(position.pos);
          }}
        >
          <EditorContent
            editor={editor}
            className="prose max-w-none"
            onClick={(event) => activateSpellcheckIssue(event.target)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              const target = event.target;
              if (!(target instanceof Element)) return;
              if (!target.closest("[data-spellcheck-id]")) return;
              event.preventDefault();
              activateSpellcheckIssue(target);
            }}
          />
        </ImageAttachments>
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
      {spellcheckEnabled && spellcheckMessage ? (
        <p
          className="mt-2 text-xs text-slate-500"
          role="status"
          aria-live="polite"
        >
          {spellcheckMessage}
        </p>
      ) : null}
      {spellcheckEnabled && activeIssue && activeSpellcheckIssue ? (
        <SpellcheckPopover
          issue={activeIssue}
          anchor={activeSpellcheckIssue.anchor}
          onApply={() => applySpellcheckIssue(activeIssue)}
          onIgnore={() => ignoreSpellcheckIssue(activeIssue.id)}
          onClose={() => setActiveSpellcheckIssue(null)}
        />
      ) : null}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={initialSerializedContent}
      />
    </>
  );
}
