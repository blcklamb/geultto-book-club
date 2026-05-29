import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleTimetableEditor } from "../ScheduleTimetableEditor";

const timetableItems = [
  {
    id: "item-1",
    startTime: "10:05:00",
    endTime: "10:10:00",
    detail: "자기 소개",
  },
  {
    id: "item-2",
    startTime: "10:10:00",
    endTime: "11:10:00",
    detail: "독후감 공유",
  },
];

describe("ScheduleTimetableEditor", () => {
  it("타임테이블 행을 시간 범위와 상세 항목으로 렌더링한다", () => {
    render(
      <ScheduleTimetableEditor
        scheduleId="schedule-1"
        items={timetableItems}
        canEdit={false}
      />,
    );

    expect(screen.getByText("10:05-10:10")).toBeInTheDocument();
    expect(screen.getByText("자기 소개")).toBeInTheDocument();
    expect(screen.getByText("10:10-11:10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "편집" })).not.toBeInTheDocument();
  });

  it("편집 가능 상태에서 빈 타임테이블은 10:00 시작 행을 기본으로 보여준다", async () => {
    const user = userEvent.setup();
    render(
      <ScheduleTimetableEditor
        scheduleId="schedule-1"
        items={[]}
        canEdit={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: "편집" }));

    expect(screen.getByLabelText("시작 시간")).toHaveValue("10:00");
    expect(screen.getByLabelText("종료 시간")).toHaveValue("");
    expect(screen.getByLabelText("상세 항목")).toHaveValue("");
  });

  it("행 추가와 입력 변경을 저장 payload에 반영한다", async () => {
    const user = userEvent.setup();
    render(
      <ScheduleTimetableEditor
        scheduleId="schedule-1"
        items={[]}
        canEdit={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: "편집" }));
    fireEvent.change(screen.getByLabelText("종료 시간"), {
      target: { value: "10:30" },
    });
    fireEvent.change(screen.getByLabelText("상세 항목"), {
      target: { value: "오프닝" },
    });
    await user.click(screen.getByRole("button", { name: "행 추가" }));

    const itemPayload = document.querySelector<HTMLInputElement>(
      'input[name="items"]',
    );

    expect(itemPayload).not.toBeNull();
    expect(JSON.parse(itemPayload?.value ?? "[]")).toEqual([
      { startTime: "10:00", endTime: "10:30", detail: "오프닝" },
      { startTime: "10:30", endTime: "", detail: "" },
    ]);
  });

  it("행을 삭제하면 payload에서 제거된다", async () => {
    const user = userEvent.setup();
    render(
      <ScheduleTimetableEditor
        scheduleId="schedule-1"
        items={timetableItems}
        canEdit={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: "편집" }));
    await user.click(screen.getAllByRole("button", { name: "행 삭제" })[0]);

    const itemPayload = document.querySelector<HTMLInputElement>(
      'input[name="items"]',
    );

    expect(JSON.parse(itemPayload?.value ?? "[]")).toEqual([
      { startTime: "10:10", endTime: "11:10", detail: "독후감 공유" },
    ]);
  });
});
