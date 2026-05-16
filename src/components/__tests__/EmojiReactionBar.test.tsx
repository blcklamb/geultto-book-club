import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmojiReactionBar } from "../EmojiReactionBar";
import type { ReactionSummary } from "@/lib/reactions";

// next/dynamic은 jsdom에서 동작하지 않으므로 EmojiPicker를 mock
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // 테스트에서 동적 임포트는 사용하지 않으므로 빈 컴포넌트 반환
    const MockComponent = () => <div data-testid="emoji-picker-mock" />;
    return MockComponent;
  },
}));

const makeReactions = (
  overrides?: Partial<ReactionSummary>[],
): ReactionSummary[] =>
  (overrides ?? []).map((o, i) => ({
    emoji: "👍",
    count: 1,
    reactedByUser: false,
    nicknames: [],
    ...o,
  }));

describe("EmojiReactionBar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("반응이 없을 때 안내 문구를 표시한다", () => {
    render(<EmojiReactionBar initialReactions={[]} toggleAction={vi.fn()} />);
    expect(screen.getByText("첫 반응을 남겨보세요.")).toBeInTheDocument();
  });

  it("초기 반응 목록을 렌더링한다", () => {
    const reactions = makeReactions([
      {
        emoji: "👍",
        count: 3,
        reactedByUser: false,
        nicknames: ["홍길동", "김철수", "이영희"],
      },
      { emoji: "❤️", count: 1, reactedByUser: true, nicknames: ["나"] },
    ]);
    render(
      <EmojiReactionBar
        initialReactions={reactions}
        toggleAction={vi.fn()}
        currentUserNickname="나"
      />,
    );
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("disabled=true일 때 반응 버튼이 비활성화된다", () => {
    const reactions = makeReactions([
      { emoji: "👍", count: 2, reactedByUser: false, nicknames: [] },
    ]);
    render(
      <EmojiReactionBar
        initialReactions={reactions}
        toggleAction={vi.fn()}
        disabled={true}
      />,
    );
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("disabled=true일 때 로그인 안내 문구를 표시한다", () => {
    render(
      <EmojiReactionBar
        initialReactions={[]}
        toggleAction={vi.fn()}
        disabled={true}
      />,
    );
    expect(
      screen.getByText("로그인하면 이모지로 반응을 남길 수 있어요."),
    ).toBeInTheDocument();
  });

  it("disabled=false일 때 로그인 안내 문구를 표시하지 않는다", () => {
    render(
      <EmojiReactionBar
        initialReactions={[]}
        toggleAction={vi.fn()}
        disabled={false}
      />,
    );
    expect(
      screen.queryByText("로그인하면 이모지로 반응을 남길 수 있어요."),
    ).not.toBeInTheDocument();
  });

  it("반응 버튼 클릭 시 toggleAction을 해당 이모지로 호출한다", async () => {
    const user = userEvent.setup();
    const toggleAction = vi.fn().mockResolvedValue([]);
    const reactions = makeReactions([
      { emoji: "👍", count: 1, reactedByUser: false, nicknames: [] },
    ]);

    render(
      <EmojiReactionBar
        initialReactions={reactions}
        toggleAction={toggleAction}
      />,
    );

    await user.click(screen.getByText("👍").closest("button")!);

    await waitFor(() => {
      expect(toggleAction).toHaveBeenCalledWith("👍");
    });
  });

  it("toggleAction이 에러를 던지면 에러 메시지를 표시한다", async () => {
    const user = userEvent.setup();
    const toggleAction = vi.fn().mockRejectedValue(new Error("서버 오류"));
    const reactions = makeReactions([
      { emoji: "👍", count: 1, reactedByUser: false, nicknames: [] },
    ]);

    render(
      <EmojiReactionBar
        initialReactions={reactions}
        toggleAction={toggleAction}
      />,
    );

    await user.click(screen.getByText("👍").closest("button")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("서버 오류");
    });
  });

  it("toggleAction이 에러 없이 성공하면 에러 메시지가 없다", async () => {
    const user = userEvent.setup();
    const updatedReactions: ReactionSummary[] = [
      {
        emoji: "👍",
        count: 2,
        reactedByUser: true,
        nicknames: ["홍길동", "나"],
      },
    ];
    const toggleAction = vi.fn().mockResolvedValue(updatedReactions);
    const reactions = makeReactions([
      { emoji: "👍", count: 1, reactedByUser: false, nicknames: ["홍길동"] },
    ]);

    render(
      <EmojiReactionBar
        initialReactions={reactions}
        toggleAction={toggleAction}
        currentUserNickname="나"
      />,
    );

    await user.click(screen.getByText("👍").closest("button")!);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("닉네임이 있는 반응 버튼의 aria-label에 반응자 이름이 포함된다", () => {
    const reactions: ReactionSummary[] = [
      {
        emoji: "👍",
        count: 2,
        reactedByUser: false,
        nicknames: ["홍길동", "김철수"],
      },
    ];

    render(
      <EmojiReactionBar initialReactions={reactions} toggleAction={vi.fn()} />,
    );

    const btn = screen.getByRole("button", {
      name: /홍길동.*김철수|김철수.*홍길동/,
    });
    expect(btn).toBeInTheDocument();
  });

  it("닉네임이 없는 반응 버튼의 aria-label이 '이모지 반응'이다", () => {
    const reactions: ReactionSummary[] = [
      { emoji: "👍", count: 1, reactedByUser: false, nicknames: [] },
    ];

    render(
      <EmojiReactionBar initialReactions={reactions} toggleAction={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "이모지 반응" }),
    ).toBeInTheDocument();
  });
});
