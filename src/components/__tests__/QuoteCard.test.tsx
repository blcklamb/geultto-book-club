import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteCard } from "../QuoteCard";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const defaultQuote = {
  id: "quote-456",
  scheduleTitle: "2024년 2월 독서모임",
  page: "42",
  text: "글쓰기는 생각을 정제하는 과정이다.",
  author: "김철수",
};

describe("QuoteCard", () => {
  it("일정 제목을 렌더링한다", () => {
    render(<QuoteCard quote={defaultQuote} />);
    expect(screen.getByText("2024년 2월 독서모임")).toBeInTheDocument();
  });

  it("페이지 번호를 'p.42' 형식으로 렌더링한다", () => {
    render(<QuoteCard quote={defaultQuote} />);
    expect(screen.getByText("p.42")).toBeInTheDocument();
  });

  it("인용문 텍스트를 렌더링한다", () => {
    render(<QuoteCard quote={defaultQuote} />);
    // 따옴표 유형(직선/곡선)에 무관하게 본문 텍스트 존재 여부를 확인
    expect(
      screen.getByText(/글쓰기는 생각을 정제하는 과정이다/)
    ).toBeInTheDocument();
  });

  it("작성자를 'by 작성자' 형식으로 렌더링한다", () => {
    render(<QuoteCard quote={defaultQuote} />);
    expect(screen.getByText("by 김철수")).toBeInTheDocument();
  });

  it("인용구 상세 페이지로 연결되는 링크를 가진다", () => {
    render(<QuoteCard quote={defaultQuote} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/quotes/quote-456");
  });
});
