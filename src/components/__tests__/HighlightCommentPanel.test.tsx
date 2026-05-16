import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HighlightCommentPanel } from "../HighlightCommentPanel";
import type { HighlightWithComments } from "@/lib/highlight";
import type { ReactionSummary } from "@/lib/reactions";

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

// next/dynamic는 jsdom에서 동작하지 않으므로 EmojiPicker mock
vi.mock("next/dynamic", () => ({
  default: () => {
    const MockComponent = () => <div data-testid="emoji-picker-mock" />;
    return MockComponent;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

// fetch mock
const mockFetch = vi.fn();

const makeHighlight = (
  overrides?: Partial<HighlightWithComments>,
): HighlightWithComments => ({
  id: "h1",
  highlightText: "인상 깊은 구절입니다",
  authorId: "author-1",
  authorNickname: "홍길동",
  startPos: 10,
  endPos: 25,
  comments: [],
  ...overrides,
});

const makeComment = (overrides?: object) => ({
  id: "c1",
  body: "좋은 구절이에요",
  author: "김철수",
  createdAt: "2024-01-01 12:00:00",
  reactions: [] as ReactionSummary[],
  replies: [],
  ...overrides,
});

describe("HighlightCommentPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("하이라이트된 텍스트를 인용구로 표시한다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText(/인상 깊은 구절입니다/)).toBeInTheDocument();
  });

  it("하이라이트 작성자 닉네임을 표시한다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText(/홍길동 님이 하이라이트함/)).toBeInTheDocument();
  });

  it("댓글이 없을 때 안내 문구를 표시한다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight({ comments: [] })}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("첫 댓글을 남겨보세요")).toBeInTheDocument();
  });

  it("기존 댓글 목록을 렌더링한다", () => {
    const highlight = makeHighlight({
      comments: [
        makeComment({ id: "c1", author: "김철수", body: "좋은 구절이에요" }),
        makeComment({ id: "c2", author: "이영희", body: "저도 좋아요" }),
      ],
    });
    render(
      <HighlightCommentPanel
        highlight={highlight}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("좋은 구절이에요")).toBeInTheDocument();
    expect(screen.getByText("저도 좋아요")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("이영희")).toBeInTheDocument();
  });

  it("disabled=true일 때 댓글 입력폼을 표시하지 않는다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        disabled={true}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(
      screen.queryByPlaceholderText("이 구절에 대한 생각을 남겨보세요"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "댓글 등록" }),
    ).not.toBeInTheDocument();
  });

  it("댓글 등록 버튼은 내용이 비어있으면 비활성화된다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "댓글 등록" })).toBeDisabled();
  });

  it("댓글 입력 후 등록하면 목록에 추가되고 onCommentsUpdated가 호출된다", async () => {
    const user = userEvent.setup();
    const onCommentsUpdated = vi.fn();
    const newComment = makeComment({
      id: "c-new",
      author: "나",
      body: "새 댓글 내용",
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newComment,
    });

    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={onCommentsUpdated}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("이 구절에 대한 생각을 남겨보세요"),
      "새 댓글 내용",
    );
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    await waitFor(() => {
      expect(screen.getByText("새 댓글 내용")).toBeInTheDocument();
    });
    expect(onCommentsUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        comments: expect.arrayContaining([
          expect.objectContaining({ id: "c-new" }),
        ]),
      }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("댓글이 등록되었습니다.");
  });

  it("댓글 등록 API 실패 시 에러 토스트를 띄운다", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "댓글 작성 실패" }),
    });

    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("이 구절에 대한 생각을 남겨보세요"),
      "내용",
    );
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("댓글 작성 실패");
    });
  });

  it("현재 사용자가 하이라이트 작성자이면 삭제 버튼이 표시된다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight({ authorId: "user-1" })}
        currentUserId="user-1"
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "하이라이트 삭제" }),
    ).toBeInTheDocument();
  });

  it("현재 사용자가 하이라이트 작성자가 아니면 삭제 버튼이 없다", () => {
    render(
      <HighlightCommentPanel
        highlight={makeHighlight({ authorId: "user-1" })}
        currentUserId="user-2"
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "하이라이트 삭제" }),
    ).not.toBeInTheDocument();
  });

  it("하이라이트 삭제 성공 시 onHighlightDeleted가 호출된다", async () => {
    const user = userEvent.setup();
    const onHighlightDeleted = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(
      <HighlightCommentPanel
        highlight={makeHighlight({ id: "h1", authorId: "user-1" })}
        currentUserId="user-1"
        onClose={vi.fn()}
        onHighlightDeleted={onHighlightDeleted}
        onCommentsUpdated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "하이라이트 삭제" }));

    await waitFor(() => {
      expect(onHighlightDeleted).toHaveBeenCalledWith("h1");
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "하이라이트가 삭제되었습니다.",
    );
  });

  it("하이라이트 삭제 실패 시 에러 토스트를 띄운다", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "하이라이트 삭제 실패" }),
    });

    render(
      <HighlightCommentPanel
        highlight={makeHighlight({ authorId: "user-1" })}
        currentUserId="user-1"
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "하이라이트 삭제" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("하이라이트 삭제 실패");
    });
  });

  it("댓글의 '답글 달기' 버튼 클릭 시 답글 입력폼이 나타난다", async () => {
    const user = userEvent.setup();
    const highlight = makeHighlight({
      comments: [makeComment()],
    });

    render(
      <HighlightCommentPanel
        highlight={highlight}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "답글 달기" }));

    expect(
      screen.getByPlaceholderText("답글을 입력하세요"),
    ).toBeInTheDocument();
  });

  it("답글 등록 후 목록에 추가된다", async () => {
    const user = userEvent.setup();
    const highlight = makeHighlight({
      comments: [makeComment()],
    });
    const newReply = {
      id: "r1",
      body: "답글 내용입니다",
      author: "나",
      createdAt: "2024-01-01 13:00:00",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newReply,
    });

    render(
      <HighlightCommentPanel
        highlight={highlight}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "답글 달기" }));
    await user.type(
      screen.getByPlaceholderText("답글을 입력하세요"),
      "답글 내용입니다",
    );
    await user.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(screen.getByText("답글 내용입니다")).toBeInTheDocument();
    });
  });

  it("답글 폼 취소 버튼 클릭 시 폼이 닫힌다", async () => {
    const user = userEvent.setup();
    const highlight = makeHighlight({ comments: [makeComment()] });

    render(
      <HighlightCommentPanel
        highlight={highlight}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "답글 달기" }));
    expect(
      screen.getByPlaceholderText("답글을 입력하세요"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen.queryByPlaceholderText("답글을 입력하세요"),
    ).not.toBeInTheDocument();
  });

  it("기존 대댓글 목록을 렌더링한다", () => {
    const highlight = makeHighlight({
      comments: [
        makeComment({
          replies: [
            {
              id: "r1",
              body: "첫 번째 답글",
              author: "나",
              createdAt: "2024-01-01",
            },
          ],
        }),
      ],
    });

    render(
      <HighlightCommentPanel
        highlight={highlight}
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText("첫 번째 답글")).toBeInTheDocument();
  });

  it("댓글 이모지 반응 토글 시 업데이트된 목록을 반영한다", async () => {
    const user = userEvent.setup();
    const updatedReactions: ReactionSummary[] = [
      {
        emoji: "👍",
        count: 1,
        reactedByUser: true,
        nicknames: ["나"],
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedReactions,
    });

    const highlight = makeHighlight({
      comments: [
        makeComment({
          reactions: [
            { emoji: "👍", count: 1, reactedByUser: false, nicknames: [] },
          ],
        }),
      ],
    });

    render(
      <HighlightCommentPanel
        highlight={highlight}
        currentUserNickname="나"
        onClose={vi.fn()}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    const reactionBtn = screen.getByText("👍").closest("button")!;
    await user.click(reactionBtn);

    await waitFor(() => {
      // reactedByUser becomes true → button variant changes to "secondary"
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/highlights/comments/c1/reactions"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("Sheet 닫힘 이벤트 시 onClose가 호출된다", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <HighlightCommentPanel
        highlight={makeHighlight()}
        onClose={onClose}
        onHighlightDeleted={vi.fn()}
        onCommentsUpdated={vi.fn()}
      />,
    );

    // Sheet의 닫기 버튼 클릭 (SheetClose 내 X 버튼)
    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
