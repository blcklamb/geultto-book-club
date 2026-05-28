import { describe, expect, it } from "vitest";
import {
  MAX_TIMETABLE_ITEMS,
  isValidTimetableTime,
  parseTimetableItemsJson,
  validateTimetableItems,
} from "../schedule-timetable";

describe("schedule timetable validation", () => {
  it("HH:mm 형식의 시간만 허용한다", () => {
    expect(isValidTimetableTime("10:00")).toBe(true);
    expect(isValidTimetableTime("23:59")).toBe(true);
    expect(isValidTimetableTime("24:00")).toBe(false);
    expect(isValidTimetableTime("10:00:00")).toBe(false);
  });

  it("정상 항목을 trim하고 순서를 유지한다", () => {
    expect(
      validateTimetableItems([
        { startTime: "10:00", endTime: "10:30", detail: " 오프닝 " },
        { startTime: "10:30", endTime: "11:10", detail: "독후감 공유" },
      ]),
    ).toEqual([
      { startTime: "10:00", endTime: "10:30", detail: "오프닝" },
      { startTime: "10:30", endTime: "11:10", detail: "독후감 공유" },
    ]);
  });

  it("잘못된 시간과 빈 상세 항목을 거부한다", () => {
    expect(() =>
      validateTimetableItems([
        { startTime: "10:00", endTime: "", detail: "오프닝" },
      ]),
    ).toThrow("1번째 항목의 시간이 올바르지 않습니다");

    expect(() =>
      validateTimetableItems([
        { startTime: "10:00", endTime: "10:30", detail: " " },
      ]),
    ).toThrow("1번째 항목의 상세 항목을 입력해주세요");
  });

  it("최대 행 개수를 제한한다", () => {
    expect(() =>
      validateTimetableItems(
        Array.from({ length: MAX_TIMETABLE_ITEMS + 1 }, () => ({
          startTime: "10:00",
          endTime: "10:30",
          detail: "오프닝",
        })),
      ),
    ).toThrow(`타임테이블은 최대 ${MAX_TIMETABLE_ITEMS}개까지 저장할 수 있습니다`);
  });

  it("JSON payload를 파싱한다", () => {
    expect(
      parseTimetableItemsJson(
        JSON.stringify([{ startTime: "10:00", endTime: "10:30", detail: "오프닝" }]),
      ),
    ).toEqual([{ startTime: "10:00", endTime: "10:30", detail: "오프닝" }]);

    expect(() => parseTimetableItemsJson("{")).toThrow(
      "타임테이블 형식이 올바르지 않습니다",
    );
  });
});
