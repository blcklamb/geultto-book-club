import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useEffect } from "react";
import type { ReviewActivation } from "../ReviewViewerLazy";
import type { HighlightWithComments } from "@/lib/highlight";
import { ReviewViewerLazy } from "../ReviewViewerLazy";

const mock = vi.hoisted(() => ({ highlights: [] as HighlightWithComments[], refresh: vi.fn(), viewer: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mock.search) }));
vi.mock("@/hooks/useReviewHighlights", () => ({
  useReviewHighlights: () => ({ highlights: mock.highlights, updateHighlights: vi.fn(), requestRefresh: mock.refresh }),
  highlightPositionsKey: (values: HighlightWithComments[]) => JSON.stringify(values.map(h => [h.id, h.startPos, h.endPos])),
}));
vi.mock("../ReviewViewerInteractive", () => ({ ReviewViewerInteractive: (props: { onReady: () => void; visible: boolean; activation: ReviewActivation }) => {
  mock.viewer(props);
  useEffect(() => props.onReady(), [props.onReady]);
  return <div data-testid="interactive" data-visible={String(props.visible)}>{JSON.stringify(props.activation)}</div>;
} }));
const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "읽기 본문" }] }] };
function view(disabled = false, initialHighlights: HighlightWithComments[] = []) {
  return <ReviewViewerLazy reviewId="r1" content={content} initialHighlights={initialHighlights} disabled={disabled}>
    <p data-testid="static"><span data-pm-text="" data-pm-start="1" data-pm-end="6">읽기 본문</span><mark data-highlight-id="h1">기존 구절</mark></p>
  </ReviewViewerLazy>;
}
describe("deferred review activation", () => {
  beforeEach(() => { mock.highlights = []; mock.search = ""; mock.viewer.mockClear(); mock.refresh.mockClear(); window.getSelection()?.removeAllRanges(); });
  it("keeps reading static and does not mount the editor for comment-only updates", () => {
    const initial = [{ id: "h1", startPos: 1, endPos: 3, comments: [] } as unknown as HighlightWithComments];
    mock.highlights = initial;
    const { rerender } = render(view(false, initial));
    expect(screen.getByTestId("static")).toBeInTheDocument();
    expect(mock.viewer).not.toHaveBeenCalled();
    // A snapshot with identical mark positions must not activate the editor.
    mock.highlights = [{ ...initial[0], authorImageUrl: "/new-avatar.png", comments: [{ id: "c-new" }] as HighlightWithComments["comments"] }];
    rerender(view(false, initial));
    expect(mock.viewer).not.toHaveBeenCalled();
  });
  it("restores the final reverse selection after the pointer is released", async () => {
    render(view());
    const body = screen.getByTestId("static");
    const text = body.querySelector("span")!.firstChild!;
    fireEvent.pointerDown(body);
    await act(async () => {
      window.getSelection()!.setBaseAndExtent(text, 5, text, 1);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await waitFor(() => expect(screen.getByTestId("interactive")).toHaveAttribute("data-visible", "false"));
    expect(body).toBeInTheDocument();
    await act(async () => {
      window.getSelection()!.setBaseAndExtent(text, 4, text, 0);
      document.dispatchEvent(new Event("selectionchange"));
      fireEvent.pointerUp(document);
    });
    await waitFor(() => expect(screen.getByTestId("interactive")).toHaveAttribute("data-visible", "true"));
    const activation = JSON.parse(screen.getByTestId("interactive").textContent!);
    expect(activation.selection.anchor).toBe(5);
    expect(activation.selection.head).toBe(1);
    expect(screen.queryByTestId("static")).toBeNull();
  });
  it("does not activate on selection for disabled users, but opens existing highlights", async () => {
    render(view(true));
    const text = screen.getByTestId("static").querySelector("span")!.firstChild!;
    act(() => { window.getSelection()!.setBaseAndExtent(text, 0, text, 3); document.dispatchEvent(new Event("selectionchange")); });
    expect(mock.viewer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("기존 구절"));
    await waitFor(() => expect(screen.getByTestId("interactive")).toHaveAttribute("data-visible", "true"));
    expect(JSON.parse(screen.getByTestId("interactive").textContent!).highlightId).toBe("h1");
    expect(mock.refresh).toHaveBeenCalledTimes(1);
  });
  it("opens reply deep links and repeated same-page notification events", async () => {
    mock.search = "highlight=h1&comment=c1&reply=reply1";
    render(view());
    await waitFor(() => expect(screen.getByTestId("interactive")).toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId("interactive").textContent!)).toEqual({ highlightId: "h1", commentId: "c1", replyId: "reply1" });
    act(() => window.dispatchEvent(new CustomEvent("open-highlight-notification", { detail: { reviewId: "r1", highlightId: "h2", commentId: "c2" } })));
    expect(JSON.parse(screen.getByTestId("interactive").textContent!).highlightId).toBe("h2");
    expect(mock.refresh).toHaveBeenCalledTimes(2);
  });
  it("activates when realtime changes the visible mark positions", async () => {
    const { rerender } = render(view());
    mock.highlights = [{ id: "h1", startPos: 1, endPos: 3, comments: [] } as unknown as HighlightWithComments];
    rerender(view());
    await waitFor(() => expect(screen.getByTestId("interactive")).toBeInTheDocument());
  });
});
