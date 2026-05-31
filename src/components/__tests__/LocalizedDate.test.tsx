import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalizedDate } from "../LocalizedDate";

const OriginalDateTimeFormat = Intl.DateTimeFormat;

afterEach(() => {
  Intl.DateTimeFormat = OriginalDateTimeFormat;
});

describe("LocalizedDate", () => {
  it("브라우저 Intl 포맷터로 시간을 렌더링한다", () => {
    const format = vi.fn(() => "2026. 5. 17. 오전 9:00");

    Intl.DateTimeFormat = vi.fn(function MockDateTimeFormat() {
      return { format } as unknown as Intl.DateTimeFormat;
    }) as unknown as typeof Intl.DateTimeFormat;

    render(
      <LocalizedDate
        value="2026-05-17T00:00:00.000Z"
        options={{ dateStyle: "medium", timeStyle: "short" }}
      />,
    );

    expect(Intl.DateTimeFormat).toHaveBeenCalledWith("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    });
    expect(format).toHaveBeenCalled();
    expect(screen.getByText("2026. 5. 17. 오전 9:00")).toBeInTheDocument();
  });

  it("잘못된 값에는 fallback을 렌더링한다", () => {
    render(<LocalizedDate value="not-a-date" fallback="-" />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
