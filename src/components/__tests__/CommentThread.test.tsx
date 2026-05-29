import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentThread } from "../CommentThread";
import type { ReactionSummary } from "@/lib/reactions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../LocalizedDate", () => ({
  LocalizedDate: ({ value }: { value: string | null | undefined }) => (
    <span>{value ?? "-"}</span>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../EmojiReactionBar", () => ({
  EmojiReactionBar: ({
    initialReactions,
    toggleAction,
    disabled,
  }: {
    initialReactions: ReactionSummary[];
    toggleAction: (emoji: string) => Promise<ReactionSummary[]>;
    disabled?: boolean;
  }) => (
    <div data-testid="emoji-reaction-bar" data-disabled={disabled}>
      {initialReactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleAction(r.emoji)}
          disabled={disabled}
        >
          {r.emoji} {r.count}
        </button>
      ))}
      {!disabled && (
        <button onClick={() => toggleAction("👍")}>반응 추가</button>
      )}
    </div>
  ),
}));

const sampleComments = [
  {
    id: "c-1",
    author: "홍길동",
    body: "좋은 리뷰 감사합니다.",
    createdAt: "2024-01-15",
  },
  {
    id: "c-2",
    author: "김철수",
    body: "저도 이 책 읽었는데 공감해요.",
    createdAt: "2024-01-16",
  },
];

const sampleCommentsWithReplies = [
  {
    id: "c-1",
    author: "홍길동",
    body: "좋은 리뷰 감사합니다.",
    createdAt: "2024-01-15",
    replies: [
      {
        id: "r-1",
        author: "이영희",
        body: "저도 동의해요!",
        createdAt: "2024-01-16",
      },
    ],
  },
];

const sampleCommentsWithReplyReactions = [
  {
    id: "c-1",
    author: "홍길동",
    body: "좋은 리뷰 감사합니다.",
    createdAt: "2024-01-15",
    replies: [
      {
        id: "r-1",
        author: "이영희",
        body: "저도 동의해요!",
        createdAt: "2024-01-16",
        reactions: [
          { emoji: "🔥", count: 3, reactedByUser: true, nicknames: ["A", "B", "C"] },
        ],
      },
      {
        id: "r-2",
        author: "박민수",
        body: "좋은 내용이에요.",
        createdAt: "2024-01-17",
        reactions: [],
      },
    ],
  },
];

const sampleCommentsWithReactions = [
  {
    id: "c-1",
    author: "홍길동",
    body: "좋은 리뷰 감사합니다.",
    createdAt: "2024-01-15",
    reactions: [
      { emoji: "👍", count: 2, reactedByUser: false, nicknames: ["A", "B"] },
      { emoji: "❤️", count: 1, reactedByUser: true, nicknames: ["홍길동"] },
    ],
  },
  {
    id: "c-2",
    author: "김철수",
    body: "저도 이 책 읽었는데 공감해요.",
    createdAt: "2024-01-16",
    reactions: [],
  },
];

describe("CommentThread", () => {
  it("댓글 목록을 렌더링한다", () => {
    render(<CommentThread comments={sampleComments} />);
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("좋은 리뷰 감사합니다.")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(
      screen.getByText("저도 이 책 읽었는데 공감해요."),
    ).toBeInTheDocument();
  });

  it("댓글 작성자 왼쪽에 아바타를 렌더링한다", () => {
    render(<CommentThread comments={sampleComments} />);
    expect(screen.getAllByLabelText("프로필 이미지")).toHaveLength(2);
  });

  it("댓글이 없으면 댓글 섹션이 비어 있다", () => {
    render(<CommentThread comments={[]} />);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("'댓글 등록' 버튼을 렌더링한다", () => {
    render(<CommentThread comments={[]} />);
    expect(
      screen.getByRole("button", { name: "댓글 등록" }),
    ).toBeInTheDocument();
  });

  it("textarea에 텍스트를 입력할 수 있다", async () => {
    const user = userEvent.setup();
    render(<CommentThread comments={[]} />);
    const textarea = screen.getByPlaceholderText("느낀 점을 남겨보세요");
    await user.type(textarea, "훌륭한 글이에요!");
    expect(textarea).toHaveValue("훌륭한 글이에요!");
  });

  it("텍스트 입력 후 '댓글 등록' 클릭 시 submitAction을 호출한다", async () => {
    const user = userEvent.setup();
    const submitAction = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} submitAction={submitAction} />);

    await user.type(
      screen.getByPlaceholderText("느낀 점을 남겨보세요"),
      "새 댓글",
    );
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    await waitFor(() => {
      expect(submitAction).toHaveBeenCalledWith("새 댓글");
    });
  });

  it("댓글 등록 후 textarea가 초기화된다", async () => {
    const user = userEvent.setup();
    const submitAction = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} submitAction={submitAction} />);

    const textarea = screen.getByPlaceholderText("느낀 점을 남겨보세요");
    await user.type(textarea, "새 댓글");
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("공백만 입력된 경우 submitAction을 호출하지 않는다", async () => {
    const user = userEvent.setup();
    const submitAction = vi.fn();
    render(<CommentThread comments={[]} submitAction={submitAction} />);

    await user.type(screen.getByPlaceholderText("느낀 점을 남겨보세요"), "   ");
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    expect(submitAction).not.toHaveBeenCalled();
  });

  it("disabled=true일 때 textarea와 버튼이 비활성화된다", () => {
    render(<CommentThread comments={[]} disabled={true} />);
    expect(screen.getByPlaceholderText("느낀 점을 남겨보세요")).toBeDisabled();
    expect(screen.getByRole("button", { name: "댓글 등록" })).toBeDisabled();
  });

  it("댓글의 작성일을 렌더링한다", () => {
    render(<CommentThread comments={sampleComments} />);
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    expect(screen.getByText("2024-01-16")).toBeInTheDocument();
  });

  describe("답글 기능", () => {
    it("replies 데이터가 있으면 답글을 렌더링한다", () => {
      render(<CommentThread comments={sampleCommentsWithReplies} />);
      expect(screen.getByText("이영희")).toBeInTheDocument();
      expect(screen.getByText("저도 동의해요!")).toBeInTheDocument();
    });

    it("submitReplyAction이 제공되면 '답글 달기' 버튼을 렌더링한다", () => {
      const submitReplyAction = vi.fn();
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
        />,
      );
      expect(
        screen.getAllByRole("button", { name: "답글 달기" }),
      ).toHaveLength(2);
    });

    it("submitReplyAction이 없으면 '답글 달기' 버튼을 렌더링하지 않는다", () => {
      render(<CommentThread comments={sampleComments} />);
      expect(
        screen.queryByRole("button", { name: "답글 달기" }),
      ).not.toBeInTheDocument();
    });

    it("disabled=true이면 '답글 달기' 버튼을 렌더링하지 않는다", () => {
      const submitReplyAction = vi.fn();
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
          disabled={true}
        />,
      );
      expect(
        screen.queryByRole("button", { name: "답글 달기" }),
      ).not.toBeInTheDocument();
    });

    it("'답글 달기' 클릭 시 답글 입력 폼이 표시된다", async () => {
      const user = userEvent.setup();
      const submitReplyAction = vi.fn();
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
        />,
      );

      const replyButtons = screen.getAllByRole("button", { name: "답글 달기" });
      await user.click(replyButtons[0]);

      expect(
        screen.getByPlaceholderText("답글을 입력하세요"),
      ).toBeInTheDocument();
    });

    it("답글 입력 후 등록 시 submitReplyAction을 올바른 commentId와 함께 호출한다", async () => {
      const user = userEvent.setup();
      const submitReplyAction = vi.fn().mockResolvedValue(undefined);
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
        />,
      );

      await user.click(screen.getAllByRole("button", { name: "답글 달기" })[0]);
      await user.type(
        screen.getByPlaceholderText("답글을 입력하세요"),
        "첫 번째 댓글에 대한 답글",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      await waitFor(() => {
        expect(submitReplyAction).toHaveBeenCalledWith(
          "c-1",
          "첫 번째 댓글에 대한 답글",
        );
      });
    });

    it("답글 등록 후 폼이 닫힌다", async () => {
      const user = userEvent.setup();
      const submitReplyAction = vi.fn().mockResolvedValue(undefined);
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
        />,
      );

      await user.click(screen.getAllByRole("button", { name: "답글 달기" })[0]);
      await user.type(
        screen.getByPlaceholderText("답글을 입력하세요"),
        "답글 내용",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("답글을 입력하세요"),
        ).not.toBeInTheDocument();
      });
    });

    it("취소 버튼 클릭 시 답글 폼이 닫힌다", async () => {
      const user = userEvent.setup();
      const submitReplyAction = vi.fn();
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
        />,
      );

      await user.click(screen.getAllByRole("button", { name: "답글 달기" })[0]);
      expect(
        screen.getByPlaceholderText("답글을 입력하세요"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(
        screen.queryByPlaceholderText("답글을 입력하세요"),
      ).not.toBeInTheDocument();
    });

    it("공백만 입력된 경우 등록 버튼이 비활성화된다", async () => {
      const user = userEvent.setup();
      const submitReplyAction = vi.fn();
      render(
        <CommentThread
          comments={sampleComments}
          submitReplyAction={submitReplyAction}
        />,
      );

      await user.click(screen.getAllByRole("button", { name: "답글 달기" })[0]);
      await user.type(
        screen.getByPlaceholderText("답글을 입력하세요"),
        "   ",
      );

      expect(screen.getByRole("button", { name: "등록" })).toBeDisabled();
    });
  });

  describe("답글 이모지 반응 기능", () => {
    it("toggleReplyReactionAction이 제공되면 모든 답글에 EmojiReactionBar를 렌더링한다", () => {
      const toggleReplyReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReplies}
          toggleReplyReactionAction={toggleReplyReactionAction}
        />,
      );
      expect(screen.getAllByTestId("emoji-reaction-bar")).toHaveLength(1);
    });

    it("toggleReplyReactionAction이 없어도 기존 반응이 있는 답글에만 EmojiReactionBar를 렌더링한다", () => {
      render(<CommentThread comments={sampleCommentsWithReplyReactions} />);
      // r-1은 반응 있음, r-2는 반응 없음 → 1개만 렌더링
      expect(screen.getAllByTestId("emoji-reaction-bar")).toHaveLength(1);
    });

    it("답글 반응 이모지와 카운트를 렌더링한다", () => {
      const toggleReplyReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReplyReactions}
          toggleReplyReactionAction={toggleReplyReactionAction}
        />,
      );
      expect(screen.getByText("🔥 3")).toBeInTheDocument();
    });

    it("답글 이모지 클릭 시 올바른 replyId와 emoji로 toggleReplyReactionAction을 호출한다", async () => {
      const user = userEvent.setup();
      const toggleReplyReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReplyReactions}
          toggleReplyReactionAction={toggleReplyReactionAction}
        />,
      );

      await user.click(screen.getByText("🔥 3"));

      await waitFor(() => {
        expect(toggleReplyReactionAction).toHaveBeenCalledWith("r-1", "🔥");
      });
    });

    it("disabled=true이면 답글 EmojiReactionBar가 비활성화 상태로 렌더링된다", () => {
      const toggleReplyReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReplyReactions}
          toggleReplyReactionAction={toggleReplyReactionAction}
          disabled={true}
        />,
      );
      const bars = screen.getAllByTestId("emoji-reaction-bar");
      bars.forEach((bar) => {
        expect(bar).toHaveAttribute("data-disabled", "true");
      });
    });
  });

  describe("이모지 반응 기능", () => {
    it("toggleReactionAction이 제공되면 모든 댓글에 EmojiReactionBar를 렌더링한다", () => {
      const toggleReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleComments}
          toggleReactionAction={toggleReactionAction}
        />,
      );
      expect(screen.getAllByTestId("emoji-reaction-bar")).toHaveLength(2);
    });

    it("toggleReactionAction이 없어도 기존 반응이 있으면 EmojiReactionBar를 렌더링한다", () => {
      render(<CommentThread comments={sampleCommentsWithReactions} />);
      // c-1은 반응 있음, c-2는 반응 없음 → 1개만 렌더링
      expect(screen.getAllByTestId("emoji-reaction-bar")).toHaveLength(1);
    });

    it("toggleReactionAction도 없고 반응도 없으면 EmojiReactionBar를 렌더링하지 않는다", () => {
      render(<CommentThread comments={sampleComments} />);
      expect(
        screen.queryByTestId("emoji-reaction-bar"),
      ).not.toBeInTheDocument();
    });

    it("기존 반응 이모지와 카운트를 렌더링한다", () => {
      const toggleReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReactions}
          toggleReactionAction={toggleReactionAction}
        />,
      );
      expect(screen.getByText("👍 2")).toBeInTheDocument();
      expect(screen.getByText("❤️ 1")).toBeInTheDocument();
    });

    it("이모지 버튼 클릭 시 올바른 commentId와 emoji로 toggleReactionAction을 호출한다", async () => {
      const user = userEvent.setup();
      const toggleReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReactions}
          toggleReactionAction={toggleReactionAction}
        />,
      );

      await user.click(screen.getByText("👍 2"));

      await waitFor(() => {
        expect(toggleReactionAction).toHaveBeenCalledWith("c-1", "👍");
      });
    });

    it("disabled=true이면 EmojiReactionBar가 비활성화 상태로 렌더링된다", () => {
      const toggleReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReactions}
          toggleReactionAction={toggleReactionAction}
          disabled={true}
        />,
      );
      const bars = screen.getAllByTestId("emoji-reaction-bar");
      bars.forEach((bar) => {
        expect(bar).toHaveAttribute("data-disabled", "true");
      });
    });

    it("currentUserNickname을 EmojiReactionBar에 전달한다", () => {
      const toggleReactionAction = vi
        .fn()
        .mockResolvedValue([] as ReactionSummary[]);
      render(
        <CommentThread
          comments={sampleCommentsWithReactions}
          toggleReactionAction={toggleReactionAction}
          currentUserNickname="홍길동"
        />,
      );
      expect(screen.getAllByTestId("emoji-reaction-bar")).toHaveLength(2);
    });
  });
});
