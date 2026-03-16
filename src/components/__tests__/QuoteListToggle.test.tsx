import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteListToggle } from "../QuoteListToggle";

describe("QuoteListToggle", () => {
  it("'3D 뷰'와 '리스트' 버튼을 렌더링한다", () => {
    render(<QuoteListToggle mode="3d" onChange={vi.fn()} />);
    expect(screen.getByText("3D 뷰")).toBeInTheDocument();
    expect(screen.getByText("리스트")).toBeInTheDocument();
  });

  it("mode='3d'일 때 '3D 뷰' 버튼이 활성화(primary) 스타일을 가진다", () => {
    render(<QuoteListToggle mode="3d" onChange={vi.fn()} />);
    const btn3d = screen.getByText("3D 뷰").closest("button");
    const btnList = screen.getByText("리스트").closest("button");
    // default variant는 bg-primary 클래스를, ghost variant는 포함하지 않음
    expect(btn3d?.className).toContain("bg-primary");
    expect(btnList?.className).not.toContain("bg-primary");
  });

  it("mode='list'일 때 '리스트' 버튼이 활성화(primary) 스타일을 가진다", () => {
    render(<QuoteListToggle mode="list" onChange={vi.fn()} />);
    const btnList = screen.getByText("리스트").closest("button");
    const btn3d = screen.getByText("3D 뷰").closest("button");
    expect(btnList?.className).toContain("bg-primary");
    expect(btn3d?.className).not.toContain("bg-primary");
  });

  it("'3D 뷰' 버튼 클릭 시 onChange('3d')를 호출한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuoteListToggle mode="list" onChange={onChange} />);
    await user.click(screen.getByText("3D 뷰"));
    expect(onChange).toHaveBeenCalledWith("3d");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("'리스트' 버튼 클릭 시 onChange('list')를 호출한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuoteListToggle mode="3d" onChange={onChange} />);
    await user.click(screen.getByText("리스트"));
    expect(onChange).toHaveBeenCalledWith("list");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
