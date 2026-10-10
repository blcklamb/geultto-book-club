import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewViewerLazy } from "../ReviewViewerLazy";
import { ReviewEditorLazy } from "../ReviewEditorLazy";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/hooks/useReviewHighlights", () => ({
  useReviewHighlights: () => ({ highlights: [], updateHighlights: vi.fn(), requestRefresh: vi.fn() }),
  highlightPositionsKey: () => "[]",
}));
vi.mock("../ReviewViewerInteractive", () => { throw new Error("network chunk unavailable"); });
vi.mock("../ReviewEditor", () => { throw new Error("network chunk unavailable"); });

describe("deferred module failures", () => {
  it("preserves the server-rendered body when the interactive chunk fails", async () => {
    render(<ReviewViewerLazy content={{ type: "doc", content: [] }} reviewId="r1" initialHighlights={[]}>
      <p>읽기 본문 <mark data-highlight-id="h1">기존 구절</mark></p>
    </ReviewViewerLazy>);
    fireEvent.click(screen.getByText("기존 구절"));
    expect(await screen.findByRole("alert")).toHaveTextContent("하이라이트 기능을 불러오지 못했습니다.");
    expect(screen.getByText(/읽기 본문/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새로고침" })).toBeInTheDocument();
  });
  it("keeps the editing form unready and offers reload after a failed editor import", async () => {
    const ready = vi.fn();
    render(<ReviewEditorLazy onReadyChange={ready} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("편집기를 불러오지 못했습니다.");
    expect(ready).not.toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "새로고침" })).toHaveAttribute("type", "button");
  });
});
