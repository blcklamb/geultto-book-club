import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserAvatar } from "../UserAvatar";

describe("UserAvatar", () => {
  it("이모지를 렌더링한다", () => {
    render(<UserAvatar emoji="📚" />);
    expect(screen.getByText("📚")).toBeInTheDocument();
  });

  it("기본 배경색이 #F1F5F9이다", () => {
    render(<UserAvatar emoji="📚" />);
    const avatar = screen.getByTestId("profile-avatar-circle");
    expect(avatar).toHaveStyle({ backgroundColor: "#F1F5F9" });
  });

  it("bgColor prop으로 배경색을 지정할 수 있다", () => {
    render(<UserAvatar emoji="📚" bgColor="#FEF3C7" />);
    const avatar = screen.getByTestId("profile-avatar-circle");
    expect(avatar).toHaveStyle({ backgroundColor: "#FEF3C7" });
  });

  it("size='sm'일 때 sm 크기 클래스를 적용한다", () => {
    const { container } = render(<UserAvatar emoji="📚" size="sm" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain("h-8");
    expect(avatar.className).toContain("w-8");
  });

  it("size='md'일 때 md 크기 클래스를 적용한다 (기본값)", () => {
    const { container } = render(<UserAvatar emoji="📚" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain("h-10");
    expect(avatar.className).toContain("w-10");
  });

  it("size='lg'일 때 lg 크기 클래스를 적용한다", () => {
    const { container } = render(<UserAvatar emoji="📚" size="lg" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain("h-14");
    expect(avatar.className).toContain("w-14");
  });

  it("원형 테두리 스타일 클래스가 적용된다", () => {
    render(<UserAvatar emoji="📚" />);
    const avatar = screen.getByTestId("profile-avatar-circle");
    expect(avatar.className).toContain("rounded-full");
  });

  it("이미지 URL을 렌더링한다", () => {
    const { container } = render(
      <UserAvatar imageUrl="https://example.com/profile.png" />,
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://example.com/profile.png");
  });

  it("상단 장식 아이템을 렌더링한다", () => {
    const { container } = render(<UserAvatar decoration="dog" />);
    expect(
      container.querySelector('[data-profile-decoration="dog"]'),
    ).toBeInTheDocument();
  });

  it("얼굴 겹침 장식 아이템을 렌더링한다", () => {
    const { container } = render(<UserAvatar decoration="sun-glasses" />);
    expect(
      container.querySelector('[data-profile-decoration="sun-glasses"]'),
    ).toBeInTheDocument();
  });

  it.each(["dog", "mic", "beard", "glasses", "sun-glasses", "star", "sprout"])(
    "추가 장식 옵션 %s를 렌더링한다",
    (decoration) => {
      const { container } = render(<UserAvatar decoration={decoration} />);
      expect(
        container.querySelector(`[data-profile-decoration="${decoration}"]`),
      ).toBeInTheDocument();
    },
  );

  it.each(["unknown", "pencil", "eye-patch"])(
    "지원하지 않는 장식값 %s 는 렌더링하지 않는다",
    (decoration) => {
      const { container } = render(<UserAvatar decoration={decoration} />);
      expect(container.querySelector("[data-profile-decoration]")).toBeNull();
    },
  );
});
