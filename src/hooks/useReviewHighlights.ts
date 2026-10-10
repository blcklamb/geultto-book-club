"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/client";
import type { HighlightWithComments } from "@/lib/highlight";
import { createHighlightRefresh } from "@/lib/highlight-refresh";

type EventRow = Record<string, unknown>;
export function isRelevantHighlightEvent(reviewId: string, highlights: HighlightWithComments[], payload: { new?: EventRow; old?: EventRow }) {
  const reviewIds = [payload.new?.review_id, payload.old?.review_id].filter((id): id is string => typeof id === "string");
  if (reviewIds.length) return reviewIds.includes(reviewId);
  for (const row of [payload.new, payload.old]) {
    if (typeof row?.highlight_id === "string" && highlights.some(h => h.id === row.highlight_id)) return true;
    if (typeof row?.comment_id === "string" && highlights.some(h => h.comments.some(c => c.id === row.comment_id))) return true;
  }
  // Absence from our snapshot does not prove another review: a parent INSERT
  // may not have arrived yet, and DELETE payloads may contain only the PK.
  return true;
}

export function highlightPositionsKey(highlights: HighlightWithComments[]) {
  return JSON.stringify(highlights.map(h => [h.id, h.startPos, h.endPos]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

export function useReviewHighlights(reviewId: string, initialHighlights: HighlightWithComments[]) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const latest = useRef(highlights);
  const refresh = useRef<ReturnType<typeof createHighlightRefresh<HighlightWithComments[]>> | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const requestRefresh = useCallback(() => refresh.current?.request(), []);
  const updateHighlights = useCallback((update: (previous: HighlightWithComments[]) => HighlightWithComments[]) => {
    refresh.current?.invalidate();
    const next = update(latest.current);
    latest.current = next;
    setHighlights(next);
    requestRefresh();
  }, [requestRefresh]);

  useEffect(() => {
    const manager = createHighlightRefresh<HighlightWithComments[]>({
      fetch: async signal => {
        const response = await fetch(`/api/reviews/${reviewId}/highlights`, { signal });
        if (!response.ok) throw new Error("Highlight refresh failed");
        return response.json();
      },
      apply: next => { latest.current = next; setHighlights(next); },
    });
    refresh.current = manager;
    let channel = supabase.channel(`review-highlights-${reviewId}`);
    for (const table of ["review_highlights", "highlight_comments", "highlight_comment_replies", "highlight_comment_reactions", "highlight_reactions"]) {
      channel = channel.on("postgres_changes", {
        event: "*", schema: "public", table,
        ...(table === "review_highlights" ? { filter: `review_id=eq.${reviewId}` } : {}),
      }, payload => {
        if (isRelevantHighlightEvent(reviewId, latest.current, payload)) manager.request();
      });
    }
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") manager.request();
      if (error) console.error("[Realtime] highlights subscription error:", error);
    });
    return () => {
      manager.stop();
      if (refresh.current === manager) refresh.current = null;
      void supabase.removeChannel(channel);
    };
  }, [reviewId, supabase]);
  return { highlights, updateHighlights, requestRefresh };
}
