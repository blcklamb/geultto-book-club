"use client";

import "@/styles/tiptap.css";

import { useEditor, EditorContent } from "@tiptap/react";
import { reviewViewerExtensions } from "./review-viewer-extensions";
import type { JSONContent } from "@tiptap/core";
import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from "react";
import { Highlighter } from "lucide-react";
import { Button } from "./ui/button";
import { HighlightCommentPanel } from "./HighlightCommentPanel";
import { highlightColorFor, type HighlightWithComments } from "@/lib/highlight";
import { useReviewHighlights } from "@/hooks/useReviewHighlights";
import type { ReviewActivation } from "./ReviewViewerLazy";
import { toast } from "sonner";

type SelectionPopup = {
  x: number;
  y: number;
  from: number;
  to: number;
  text: string;
};

type ReviewViewerInteractiveProps = {
  content: JSONContent;
  reviewId: string;
  initialHighlights: HighlightWithComments[];
  disabled?: boolean;
  currentUserNickname?: string;
  currentUserId?: string;
  managedHighlights?: ReturnType<typeof useReviewHighlights>;
  activation?: ReviewActivation;
  visible?: boolean;
  onReady?: () => void;
};

export function ReviewViewerInteractive(props: ReviewViewerInteractiveProps) {
  return props.managedHighlights
    ? <InteractiveBody {...props} managedHighlights={props.managedHighlights} />
    : <StandaloneViewer {...props} />;
}

function StandaloneViewer(props: ReviewViewerInteractiveProps) {
  const managedHighlights = useReviewHighlights(props.reviewId, props.initialHighlights);
  return <InteractiveBody {...props} managedHighlights={managedHighlights} />;
}

function InteractiveBody({
  content, reviewId, disabled = false, currentUserNickname, currentUserId,
  managedHighlights, activation, visible = true, onReady,
}: ReviewViewerInteractiveProps & { managedHighlights: ReturnType<typeof useReviewHighlights> }) {
  const { highlights, updateHighlights: setHighlights, requestRefresh: refetchHighlights } = managedHighlights;
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(
    null,
  );
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  // 에디터에 실제로 mark가 적용된 하이라이트 ID → {startPos, endPos} 맵
  const appliedMarkMap = useRef<
    Map<string, { startPos: number; endPos: number }>
  >(new Map());
  const extensions = useMemo(reviewViewerExtensions, []);
  const editor = useEditor({
    extensions,
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  useEffect(() => {
    if (editor) onReady?.();
  }, [editor, onReady]);

  const restoredSelection = useRef<ReviewActivation["selection"]>(undefined);
  useLayoutEffect(() => {
    const selection = activation?.selection;
    if (!editor || !visible || !selection || selection === restoredSelection.current) return;
    restoredSelection.current = selection;
    try {
      const anchor = editor.view.domAtPos(selection.anchor);
      const head = editor.view.domAtPos(selection.head);
      const native = window.getSelection();
      native?.setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset);
      const range = native?.rangeCount ? native.getRangeAt(0) : null;
      if (range) {
        const rect = range.getBoundingClientRect();
        setSelectionPopup({ x: rect.left + rect.width / 2, y: rect.top - 48,
          from: Math.min(selection.anchor, selection.head), to: Math.max(selection.anchor, selection.head), text: selection.text });
      }
    } catch {
      // A selection superseded by navigation must not prevent reading.
    }
  }, [activation?.selection, editor, visible]);

  useEffect(() => {
    if (activation?.highlightId) setActiveHighlightId(activation.highlightId);
  }, [activation]);

  // highlights 상태가 바뀔 때(초기 로드 + Realtime 업데이트) 에디터 marks를 동기화한다.
  // appliedMarkMap을 통해 추가/삭제된 하이라이트만 처리한다.
  useEffect(() => {
    if (!editor) return;
    const { schema } = editor.state;
    const markType = schema.marks.highlight;
    if (!markType) return;

    const currentPositions = new Map(highlights.map(h => [h.id, h]));
    const newTr = editor.state.tr;
    let changed = false;

    // Remove deleted/moved marks first, without removing overlapping marks.
    for (const [id, pos] of appliedMarkMap.current) {
      const next = currentPositions.get(id);
      if (next && next.startPos === pos.startPos && next.endPos === pos.endPos) continue;
      try {
        newTr.removeMark(pos.startPos, pos.endPos, markType.create({ highlightId: id, color: highlightColorFor(id) }));
        changed = true;
      } catch { /* Stale positions must not prevent other marks updating. */ }
      appliedMarkMap.current.delete(id);
    }

    // 새로 추가된 하이라이트에 mark 추가
    for (const h of highlights) {
      if (appliedMarkMap.current.has(h.id)) continue;
      if (h.startPos == null || h.endPos == null) continue;
      try {
        newTr.addMark(
          h.startPos,
          h.endPos,
          markType.create({
            highlightId: h.id,
            color: highlightColorFor(h.id),
          }),
        );
        appliedMarkMap.current.set(h.id, {
          startPos: h.startPos,
          endPos: h.endPos,
        });
        changed = true;
      } catch {
        // 유효하지 않은 position은 건너뜀
      }
    }

    if (changed) editor.view.dispatch(newTr);
  }, [editor, highlights]);

  useEffect(() => {
    if (!visible || !activeHighlightId || activation?.highlightId !== activeHighlightId || !highlights.some(h => h.id === activeHighlightId)) return;
    const timer = window.setTimeout(() => {
      const target = activation?.replyId
        ? document.getElementById(`highlight-reply-${activation.replyId}`)
        : activation?.commentId
          ? document.getElementById(`highlight-comment-${activation.commentId}`)
          : activation?.highlightId === activeHighlightId
            ? editorWrapRef.current?.querySelector(`[data-highlight-id="${CSS.escape(activeHighlightId)}"]`)
            : null;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [activeHighlightId, highlights, activation, visible]);

  // 패널이 열릴 때 최신 프로필 사진 반영을 위해 재조회
  useEffect(() => {
    if (activeHighlightId && activeHighlightId !== activation?.highlightId) {
      refetchHighlights();
    }
  }, [activeHighlightId, activation?.highlightId, refetchHighlights]);

  // Click handler for highlighted spans → opens comment panel
  useEffect(() => {
    if (!editor) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const markEl = target.closest("[data-highlight-id]");
      if (markEl) {
        const id = markEl.getAttribute("data-highlight-id");
        if (id) {
          setActiveHighlightId(id);
          setSelectionPopup(null);
        }
      }
    };
    editor.view.dom.addEventListener("click", handleClick);
    return () => editor.view.dom.removeEventListener("click", handleClick);
  }, [editor]);

  // Native text-selection → show "하이라이트" toolbar (non-editable mode)
  useEffect(() => {
    if (!editor || disabled) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectionPopup(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const selectedText = range.toString().trim();
      if (!selectedText) {
        setSelectionPopup(null);
        return;
      }

      // Only show popup when selection is inside the editor
      if (!editor.view.dom.contains(range.commonAncestorContainer)) {
        setSelectionPopup(null);
        return;
      }

      let from: number;
      let to: number;
      try {
        from = editor.view.posAtDOM(range.startContainer, range.startOffset);
        to = editor.view.posAtDOM(range.endContainer, range.endOffset);
      } catch {
        setSelectionPopup(null);
        return;
      }

      if (from >= to) {
        setSelectionPopup(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setSelectionPopup({
        x: rect.left + rect.width / 2,
        y: rect.top - 48,
        from,
        to,
        text: selectedText,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [editor, disabled]);

  // Dismiss selection popup on outside mousedown
  useEffect(() => {
    if (!selectionPopup) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-selection-popup]")) return;
      setSelectionPopup(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [selectionPopup]);

  const handleCreateHighlight = useCallback(async () => {
    if (!selectionPopup || isPending || !editor) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highlightText: selectionPopup.text,
          startPos: selectionPopup.from,
          endPos: selectionPopup.to,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "하이라이트 저장 실패");
      }
      const newHighlight: HighlightWithComments = await res.json();
      setHighlights((prev) => [...prev, newHighlight]);
      setActiveHighlightId(newHighlight.id);
      setSelectionPopup(null);
      toast.success("하이라이트가 저장되었습니다.");

      // Apply highlight mark visually
      const { schema } = editor.state;
      const markType = schema.marks.highlight;
      if (markType) {
        const newTr = editor.state.tr;
        newTr.addMark(
          selectionPopup.from,
          selectionPopup.to,
          markType.create({
            highlightId: newHighlight.id,
            color: highlightColorFor(newHighlight.id),
          }),
        );
        editor.view.dispatch(newTr);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "하이라이트 생성 실패");
      console.error("하이라이트 생성 실패:", err);
    } finally {
      setIsPending(false);
    }
  }, [selectionPopup, isPending, reviewId, editor]);

  const handleHighlightDeleted = useCallback(
    (id: string) => {
      const highlight = highlights.find((h) => h.id === id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setActiveHighlightId(null);

      if (editor && highlight) {
        const { schema } = editor.state;
        const markType = schema.marks.highlight;
        if (markType) {
          try {
            // Remove only the mark instance whose attrs match this highlight.
            // Passing markType would strip every overlapping highlight in the range.
            const specificMark = markType.create({
              highlightId: highlight.id,
              color: highlightColorFor(highlight.id),
            });
            const newTr = editor.state.tr;
            newTr.removeMark(
              highlight.startPos,
              highlight.endPos,
              specificMark,
            );
            editor.view.dispatch(newTr);
          } catch {
            // Invalid position; mark already gone
          }
        }
      }
    },
    [highlights, editor],
  );

  const handleCommentsUpdated = useCallback(
    (updated: HighlightWithComments) => {
      setHighlights((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h)),
      );
      void refetchHighlights();
    },
    [refetchHighlights],
  );

  const activeHighlight = highlights.find((h) => h.id === activeHighlightId);

  return (
    <div ref={editorWrapRef} className="relative">
      <div>
        <EditorContent editor={editor} />
      </div>

      {selectionPopup && !disabled && (
        <div
          data-selection-popup
          className="fixed z-50 flex items-center rounded-lg border border-border bg-card shadow-sm"
          style={{
            left: selectionPopup.x,
            top: selectionPopup.y,
            transform: "translateX(-50%)",
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-2 px-3 text-xs"
            onClick={handleCreateHighlight}
            disabled={isPending}
          >
            <Highlighter aria-hidden="true" />
            <span>하이라이트</span>
          </Button>
        </div>
      )}

      {activeHighlight && visible && (
        <HighlightCommentPanel
          key={activeHighlight.id}
          highlight={activeHighlight}
          disabled={disabled}
          currentUserNickname={currentUserNickname}
          currentUserId={currentUserId}
          onClose={() => setActiveHighlightId(null)}
          onHighlightDeleted={handleHighlightDeleted}
          onCommentsUpdated={handleCommentsUpdated}
        />
      )}
    </div>
  );
}
