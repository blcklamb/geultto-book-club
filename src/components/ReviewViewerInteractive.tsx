"use client";

import "@/styles/tiptap.css";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { HorizontalRule } from "./editor-extension/horizontal-rule";
import { Image } from "./editor-extension/image";
import { Strike } from "./editor-extension/strike";
import { ReviewHighlightMark } from "./editor-extension/highlight";
import type { JSONContent } from "@tiptap/core";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "./ui/button";
import { HighlightCommentPanel } from "./HighlightCommentPanel";
import { highlightColorFor, type HighlightWithComments } from "@/lib/highlight";
import { createClient } from "@supabase/client";
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
};

export function ReviewViewerInteractive({
  content,
  reviewId,
  initialHighlights,
  disabled = false,
  currentUserNickname,
  currentUserId,
}: ReviewViewerInteractiveProps) {
  const [highlights, setHighlights] =
    useState<HighlightWithComments[]>(initialHighlights);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(
    null,
  );
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  // 에디터에 실제로 mark가 적용된 하이라이트 ID → {startPos, endPos} 맵
  const appliedMarkMap = useRef<Map<string, { startPos: number; endPos: number }>>(new Map());
  // Supabase 클라이언트는 컴포넌트 수명 동안 하나만 생성
  const supabase = useMemo(() => createClient(), []);

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
      ReviewHighlightMark.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "cursor-pointer rounded-sm",
        },
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  // 하이라이트 목록을 API에서 재조회하고 에디터 마크를 갱신한다.
  const refetchHighlights = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/highlights`);
      if (!res.ok) return;
      const updated: HighlightWithComments[] = await res.json();
      setHighlights(updated);
    } catch {
      // 재조회 실패는 조용히 무시 — 기존 데이터를 유지
    }
  }, [reviewId]);

  // highlights 상태가 바뀔 때(초기 로드 + Realtime 업데이트) 에디터 marks를 동기화한다.
  // appliedMarkMap을 통해 추가/삭제된 하이라이트만 처리한다.
  useEffect(() => {
    if (!editor) return;
    const { schema } = editor.state;
    const markType = schema.marks.highlight;
    if (!markType) return;

    const currentIds = new Set(highlights.map((h) => h.id));
    const newTr = editor.state.tr;
    let changed = false;

    // 새로 추가된 하이라이트에 mark 추가
    for (const h of highlights) {
      if (appliedMarkMap.current.has(h.id)) continue;
      if (h.startPos == null || h.endPos == null) continue;
      try {
        newTr.addMark(
          h.startPos,
          h.endPos,
          markType.create({ highlightId: h.id, color: highlightColorFor(h.id) }),
        );
        appliedMarkMap.current.set(h.id, { startPos: h.startPos, endPos: h.endPos });
        changed = true;
      } catch {
        // 유효하지 않은 position은 건너뜀
      }
    }

    // 삭제된 하이라이트의 mark 제거
    for (const [id, pos] of appliedMarkMap.current) {
      if (!currentIds.has(id)) {
        try {
          newTr.removeMark(
            pos.startPos,
            pos.endPos,
            markType.create({ highlightId: id, color: highlightColorFor(id) }),
          );
          appliedMarkMap.current.delete(id);
          changed = true;
        } catch {
          appliedMarkMap.current.delete(id);
        }
      }
    }

    if (changed) editor.view.dispatch(newTr);
  }, [editor, highlights]);

  // Supabase Realtime — 하이라이트와 관련 댓글/반응 변경 시 자동 갱신
  useEffect(() => {
    const channel = supabase
      .channel(`review-highlights-${reviewId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_highlights",
          filter: `review_id=eq.${reviewId}`,
        },
        () => { refetchHighlights(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "highlight_comments" },
        () => { refetchHighlights(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "highlight_comment_replies" },
        () => { refetchHighlights(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "highlight_comment_reactions" },
        () => { refetchHighlights(); },
      )
      .subscribe((status, err) => {
        if (err) console.error("[Realtime] highlights subscription error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reviewId, refetchHighlights, supabase]);

  // 패널이 열릴 때 최신 프로필 사진 반영을 위해 재조회
  useEffect(() => {
    if (activeHighlightId) {
      refetchHighlights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHighlightId]);

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
    },
    [],
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
          className="fixed z-50 flex items-center rounded-lg border border-slate-200 bg-white shadow-lg"
          style={{
            left: selectionPopup.x,
            top: selectionPopup.y,
            transform: "translateX(-50%)",
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-3 text-xs font-medium"
            onClick={handleCreateHighlight}
            disabled={isPending}
          >
            <span aria-hidden>💬</span>
            <span>하이라이트</span>
          </Button>
        </div>
      )}

      {activeHighlight && (
        <HighlightCommentPanel
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
