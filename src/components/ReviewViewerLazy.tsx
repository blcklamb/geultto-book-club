"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { ReviewReadViewProps } from "./ReviewReadView";
import type { ReviewViewerInteractive } from "./ReviewViewerInteractive";
import { captureReviewSelection, type ReviewSelection } from "@/lib/review-selection";
import { highlightPositionsKey, useReviewHighlights } from "@/hooks/useReviewHighlights";
import { Button } from "./ui/button";

export type ReviewActivation = { selection?: ReviewSelection; highlightId?: string; commentId?: string; replyId?: string };

export function ReviewViewerLazy({ children, ...props }: ReviewReadViewProps & { children: ReactNode }) {
  const { highlights, updateHighlights, requestRefresh } = useReviewHighlights(props.reviewId, props.initialHighlights);
  const [Viewer, setViewer] = useState<typeof ReviewViewerInteractive | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activation, setActivation] = useState<ReviewActivation>({});
  const root = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const mounted = useRef(false);
  const selecting = useRef(false);
  const prepared = useRef(false);
  const searchParams = useSearchParams();
  const initialPositions = useRef(highlightPositionsKey(props.initialHighlights));
  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    setFailed(false);
    void import("./ReviewViewerInteractive").then(module => {
      if (mounted.current) setViewer(() => module.ReviewViewerInteractive);
    }).catch(() => {
      if (mounted.current) setFailed(true);
    });
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (highlightPositionsKey(highlights) !== initialPositions.current) load();
  }, [highlights, load]);
  useEffect(() => {
    if (ready || props.disabled) return;
    const capture = () => {
      if (!root.current) return;
      const selection = captureReviewSelection(root.current, window.getSelection());
      // A collapsed/outside selection cancels an earlier selection during loading.
      setActivation(previous => ({ ...previous, selection: selection ?? undefined }));
      if (selection) load();
    };
    document.addEventListener("selectionchange", capture);
    return () => document.removeEventListener("selectionchange", capture);
  }, [ready, props.disabled, load]);
  useEffect(() => {
    const finish = () => {
      if (!selecting.current) return;
      selecting.current = false;
      if (root.current && !props.disabled) {
        const selection = captureReviewSelection(root.current, window.getSelection());
        setActivation(previous => ({ ...previous, selection: selection ?? undefined }));
      }
      if (prepared.current) setReady(true);
    };
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
    return () => {
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
    };
  }, [props.disabled]);
  const openHighlight = useCallback((target: ReviewActivation) => {
    setActivation(target);
    load();
    requestRefresh();
  }, [load, requestRefresh]);
  const searchKey = searchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const highlightId = params.get("highlight");
    if (highlightId) openHighlight({ highlightId, commentId: params.get("comment") ?? undefined, replyId: params.get("reply") ?? undefined });
  }, [searchKey, openHighlight]);
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.reviewId === props.reviewId) openHighlight(detail);
    };
    window.addEventListener("open-highlight-notification", open);
    return () => window.removeEventListener("open-highlight-notification", open);
  }, [props.reviewId, openHighlight]);
  const onReady = useCallback(() => {
    prepared.current = true;
    if (!selecting.current) setReady(true);
  }, []);
  return <div ref={root} className="relative" onPointerDown={() => {
    if (!ready) selecting.current = true;
  }}>
    {!ready && <div onClick={event => {
      const id = (event.target as HTMLElement).closest("[data-highlight-id]")?.getAttribute("data-highlight-id");
      if (id) openHighlight({ highlightId: id });
    }}>{children}</div>}
    {Viewer && <div style={ready ? undefined : { position: "absolute", visibility: "hidden", pointerEvents: "none", inset: 0 }}>
      <Viewer {...props} initialHighlights={highlights} managedHighlights={{ highlights, updateHighlights, requestRefresh }} activation={activation} visible={ready} onReady={onReady} />
    </div>}
    {failed && <p role="alert" className="mt-2 text-sm">하이라이트 기능을 불러오지 못했습니다. <Button type="button" variant="ghost" onClick={() => {
      // Turbopack caches rejected chunk promises until a full navigation.
      // Keep the requested panel target when retrying after that navigation.
      if (activation.highlightId) {
        const url = new URL(window.location.href);
        url.searchParams.set("highlight", activation.highlightId);
        if (activation.commentId) url.searchParams.set("comment", activation.commentId); else url.searchParams.delete("comment");
        if (activation.replyId) url.searchParams.set("reply", activation.replyId); else url.searchParams.delete("reply");
        window.location.assign(url.href);
      } else window.location.reload();
    }}>새로고침</Button></p>}
  </div>;
}
