import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileImageField } from "../ProfileImageField";

describe("ProfileImageField", () => {
  it("파일 입력을 렌더링한다", () => {
    render(<ProfileImageField />);
    expect(screen.getByLabelText("이미지 선택")).toHaveAttribute(
      "type",
      "file",
    );
  });

  it("초기 이미지 URL을 미리보기에 렌더링한다", () => {
    const { container } = render(
      <ProfileImageField initialImageUrl="https://example.com/me.png" />,
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://example.com/me.png");
  });

  it("이미지를 선택하면 미리보기 URL을 갱신한다", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:preview");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    const { container } = render(<ProfileImageField />);
    const file = new File(["image"], "profile.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("이미지 선택"), file);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "blob:preview");

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it("초기 장식값을 hidden input에 렌더링한다", () => {
    const { container } = render(<ProfileImageField initialDecoration="dog" />);
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="profileDecoration"]',
      )?.value,
    ).toBe("dog");
  });

  it("다음 화살표 클릭 시 hidden input과 미리보기를 갱신한다", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfileImageField />);

    await user.click(screen.getByRole("button", { name: "다음 장식" }));

    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="profileDecoration"]',
      )?.value,
    ).toBe("cat");
    expect(
      container.querySelector('[data-current-decoration="cat"]'),
    ).toBeInTheDocument();
  });

  it("이전 화살표 클릭 시 이전 장식으로 순환한다", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfileImageField />);

    await user.click(screen.getByRole("button", { name: "이전 장식" }));

    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="profileDecoration"]',
      )?.value,
    ).toBe("sprout");
    expect(
      container.querySelector('[data-current-decoration="sprout"]'),
    ).toBeInTheDocument();
  });

  it("장식 전환 중 슬라이드 애니메이션 클래스를 적용한다", async () => {
    const user = userEvent.setup();
    render(<ProfileImageField initialDecoration="cat" />);

    await user.click(screen.getByRole("button", { name: "다음 장식" }));

    const currentDecoration = screen
      .getByRole("button", { name: "다음 장식" })
      .parentElement?.querySelector('[data-current-decoration="dog"]');

    expect(currentDecoration?.className).toContain(
      "animate-decoration-slide-in-right",
    );
  });
});
