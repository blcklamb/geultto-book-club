import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewCard } from "../ReviewCard";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const defaultProps = {
  id: "review-123",
  title: "개발자의 글쓰기 후기",
  author: "홍길동",
  scheduleTitle: "2024년 1월 독서모임",
  createdAt: "2024-01-15",
};

describe("ReviewCard", () => {
  it("제목을 렌더링한다", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("개발자의 글쓰기 후기")).toBeInTheDocument();
  });

  it("작성자를 렌더링한다", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });

  it("작성자 왼쪽에 아바타를 렌더링한다", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByLabelText("프로필 이미지")).toBeInTheDocument();
  });

  it("일정 제목을 렌더링한다", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("2024년 1월 독서모임")).toBeInTheDocument();
  });

  it("작성일을 렌더링한다", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText(/2024\. 1\. 15\./)).toBeInTheDocument();
  });

  it("리뷰 상세 페이지로 연결되는 링크를 가진다", () => {
    render(<ReviewCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/reviews/review-123");
  });
});
