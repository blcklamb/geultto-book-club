import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileImageField } from "../ProfileImageField";

describe("ProfileImageField", () => {
  it("파일 입력을 렌더링한다", () => {
    render(<ProfileImageField />);
    expect(screen.getByLabelText("이미지 선택")).toHaveAttribute(
      "type",
      "file"
    );
  });

  it("초기 이미지 URL을 미리보기에 렌더링한다", () => {
    const { container } = render(
      <ProfileImageField initialImageUrl="https://example.com/me.png" />
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
});
