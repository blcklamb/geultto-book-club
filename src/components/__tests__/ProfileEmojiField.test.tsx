import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileEmojiField } from "../ProfileEmojiField";
import * as utils from "@/lib/utils";

const BOOK_EMOJIS = [
  "📕", "📗", "📘", "📙", "📓", "📔", "📒", "📚", "📖", "📄",
];

describe("ProfileEmojiField", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("초기 이모지를 렌더링한다", () => {
    render(<ProfileEmojiField initialEmoji="📕" />);
    expect(screen.getByText("📕")).toBeInTheDocument();
  });

  it("initialEmoji가 빈 문자열이면 기본값 📚을 사용한다", () => {
    render(<ProfileEmojiField initialEmoji="" />);
    expect(screen.getByText("📚")).toBeInTheDocument();
  });

  it("hidden input의 name이 'profileEmoji'이다", () => {
    const { container } = render(<ProfileEmojiField initialEmoji="📕" />);
    const hiddenInput = container.querySelector(
      'input[type="hidden"]'
    ) as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput.name).toBe("profileEmoji");
  });

  it("hidden input의 초기값이 initialEmoji와 동일하다", () => {
    const { container } = render(<ProfileEmojiField initialEmoji="📕" />);
    const hiddenInput = container.querySelector(
      'input[type="hidden"]'
    ) as HTMLInputElement;
    expect(hiddenInput.value).toBe("📕");
  });

  it("버튼 클릭 시 randomBookEmoji를 호출하여 이모지를 변경한다", async () => {
    const user = userEvent.setup();
    const mockEmoji = "📗";
    vi.spyOn(utils, "randomBookEmoji").mockReturnValue(mockEmoji);

    render(<ProfileEmojiField initialEmoji="📕" />);
    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByText("📗")).toBeInTheDocument();
  });

  it("버튼 클릭 시 hidden input 값이 새 이모지로 업데이트된다", async () => {
    const user = userEvent.setup();
    vi.spyOn(utils, "randomBookEmoji").mockReturnValue("📗");

    const { container } = render(<ProfileEmojiField initialEmoji="📕" />);
    await user.click(screen.getByRole("button"));

    const hiddenInput = container.querySelector(
      'input[type="hidden"]'
    ) as HTMLInputElement;
    expect(hiddenInput.value).toBe("📗");
  });

  it("버튼을 여러 번 클릭해도 매번 새 이모지로 변경된다", async () => {
    const user = userEvent.setup();
    vi.spyOn(utils, "randomBookEmoji")
      .mockReturnValueOnce("📗")
      .mockReturnValueOnce("📘");

    render(<ProfileEmojiField initialEmoji="📕" />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(screen.getByText("📗")).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByText("📘")).toBeInTheDocument();
  });

  it("'프로필 이모지' 레이블 텍스트를 렌더링한다", () => {
    render(<ProfileEmojiField initialEmoji="📕" />);
    expect(screen.getByText("프로필 이모지")).toBeInTheDocument();
  });

  it("반환된 이모지가 유효한 이모지 목록에 포함된다", async () => {
    const user = userEvent.setup();
    vi.spyOn(utils, "randomBookEmoji").mockReturnValue(BOOK_EMOJIS[3]);

    render(<ProfileEmojiField initialEmoji="📕" />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByText(BOOK_EMOJIS[3])).toBeInTheDocument();
  });
});
