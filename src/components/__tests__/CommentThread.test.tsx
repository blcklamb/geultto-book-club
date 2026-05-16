import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentThread } from "../CommentThread";

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

describe("CommentThread", () => {
  it("댓글 목록을 렌더링한다", () => {
    render(<CommentThread comments={sampleComments} />);
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("좋은 리뷰 감사합니다.")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("저도 이 책 읽었는데 공감해요.")).toBeInTheDocument();
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
      screen.getByRole("button", { name: "댓글 등록" })
    ).toBeInTheDocument();
  });

  it("textarea에 텍스트를 입력할 수 있다", async () => {
    const user = userEvent.setup();
    render(<CommentThread comments={[]} />);
    const textarea = screen.getByPlaceholderText("느낀 점을 남겨보세요");
    await user.type(textarea, "훌륭한 글이에요!");
    expect(textarea).toHaveValue("훌륭한 글이에요!");
  });

  it("텍스트 입력 후 '댓글 등록' 클릭 시 onSubmit을 호출한다", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("느낀 점을 남겨보세요"),
      "새 댓글"
    );
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("새 댓글");
    });
  });

  it("댓글 등록 후 textarea가 초기화된다", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText("느낀 점을 남겨보세요");
    await user.type(textarea, "새 댓글");
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("공백만 입력된 경우 onSubmit을 호출하지 않는다", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentThread comments={[]} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("느낀 점을 남겨보세요"),
      "   "
    );
    await user.click(screen.getByRole("button", { name: "댓글 등록" }));

    expect(onSubmit).not.toHaveBeenCalled();
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
});
