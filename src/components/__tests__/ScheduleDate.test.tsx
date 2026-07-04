import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleDate } from "../ScheduleDate";

const OriginalDateTimeFormat = Intl.DateTimeFormat;

afterEach(() => {
  Intl.DateTimeFormat = OriginalDateTimeFormat;
});

describe("ScheduleDate", () => {
  it("renders schedule timestamps in UTC wall time", () => {
    const format = vi.fn(() => "2026. 7. 4. 오전 10:00");

    Intl.DateTimeFormat = vi.fn(function MockDateTimeFormat() {
      return { format } as unknown as Intl.DateTimeFormat;
    }) as unknown as typeof Intl.DateTimeFormat;

    render(
      <ScheduleDate
        value="2026-07-04T10:00:00.000Z"
        options={{ dateStyle: "medium", timeStyle: "short" }}
      />,
    );

    expect(Intl.DateTimeFormat).toHaveBeenCalledWith("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
    expect(format).toHaveBeenCalled();
    expect(screen.getByText("2026. 7. 4. 오전 10:00")).toBeInTheDocument();
  });
});
