import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { HighlightWithComments } from "@/lib/highlight";
import { useReviewHighlights, isRelevantHighlightEvent } from "../useReviewHighlights";

const mock = vi.hoisted(() => ({
  callbacks: {} as Record<string, (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void>,
  subscribed: null as null | ((status: string) => void),
  remove: vi.fn(),
}));
vi.mock("@supabase/client", () => ({ createClient: () => ({
  channel: () => {
    const channel = {
      on: (_event: string, config: { table: string }, callback: typeof mock.callbacks[string]) => { mock.callbacks[config.table] = callback; return channel; },
      subscribe: (callback: (status: string) => void) => { mock.subscribed = callback; return channel; },
    };
    return channel;
  },
  removeChannel: mock.remove,
}) }));
const highlight: HighlightWithComments = {
  id: "h1", highlightText: "본문", authorId: "u1", authorNickname: "회원", startPos: 1, endPos: 3,
  comments: [{ id: "c1", body: "댓글", author: "회원", createdAt: null, replies: [], reactions: [] }],
};

describe("shared highlight state and subscription", () => {
  beforeEach(() => { vi.useFakeTimers(); mock.callbacks = {}; mock.remove.mockClear(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("coalesces subscription, events and panel requests and cleans up the channel", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [highlight] });
    vi.stubGlobal("fetch", fetch);
    const { result, unmount } = renderHook(() => useReviewHighlights("r1", []));
    act(() => {
      mock.subscribed!("SUBSCRIBED");
      mock.callbacks.review_highlights({ new: { review_id: "r1" } });
      mock.callbacks.highlight_comments({ new: { highlight_id: "h1" } });
      result.current.requestRefresh();
    });
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.highlights).toEqual([highlight]);
    act(() => mock.callbacks.review_highlights({ new: { review_id: "another" } }));
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(fetch).toHaveBeenCalledTimes(1);
    // PK-only deletes must refresh even without their parent relationship.
    act(() => mock.callbacks.highlight_comment_reactions({ old: { id: "reaction1" } }));
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(fetch).toHaveBeenCalledTimes(2);
    unmount();
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });
  it("reflects successful mutations immediately and protects them from an earlier request", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(res => { resolve = res; })));
    const { result, unmount } = renderHook(() => useReviewHighlights("r1", []));
    act(() => mock.subscribed!("SUBSCRIBED"));
    await act(() => vi.advanceTimersByTimeAsync(150));
    act(() => result.current.updateHighlights(() => [highlight]));
    expect(result.current.highlights).toEqual([highlight]);
    await act(async () => { resolve({ ok: true, json: async () => [] }); });
    expect(result.current.highlights).toEqual([highlight]);
    unmount();
  });
  it("recognizes both sides of moved rows and keeps ambiguous events", () => {
    expect(isRelevantHighlightEvent("r1", [highlight], { new: { review_id: "other" }, old: { review_id: "r1" } })).toBe(true);
    expect(isRelevantHighlightEvent("r1", [highlight], { new: { review_id: "other" } })).toBe(false);
    expect(isRelevantHighlightEvent("r1", [highlight], { new: { comment_id: "c1" } })).toBe(true);
    expect(isRelevantHighlightEvent("r1", [highlight], { new: { highlight_id: "not-yet-seen" } })).toBe(true);
  });
});
