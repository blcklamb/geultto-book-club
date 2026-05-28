export type TimetableFormItem = {
  startTime?: unknown;
  endTime?: unknown;
  detail?: unknown;
};

export type TimetableItemInput = {
  startTime: string;
  endTime: string;
  detail: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MAX_TIMETABLE_ITEMS = 30;

export function isValidTimetableTime(value: string) {
  return TIME_PATTERN.test(value);
}

export function validateTimetableItems(input: unknown): TimetableItemInput[] {
  if (!Array.isArray(input)) {
    throw new Error("타임테이블 형식이 올바르지 않습니다");
  }

  if (input.length > MAX_TIMETABLE_ITEMS) {
    throw new Error(`타임테이블은 최대 ${MAX_TIMETABLE_ITEMS}개까지 저장할 수 있습니다`);
  }

  return input.map((rawItem, index) => {
    const item = rawItem as TimetableFormItem;
    const startTime =
      typeof item.startTime === "string" ? item.startTime.trim() : "";
    const endTime = typeof item.endTime === "string" ? item.endTime.trim() : "";
    const detail = typeof item.detail === "string" ? item.detail.trim() : "";

    if (!isValidTimetableTime(startTime) || !isValidTimetableTime(endTime)) {
      throw new Error(`${index + 1}번째 항목의 시간이 올바르지 않습니다`);
    }

    if (!detail) {
      throw new Error(`${index + 1}번째 항목의 상세 항목을 입력해주세요`);
    }

    return { startTime, endTime, detail };
  });
}

export function parseTimetableItemsJson(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    return validateTimetableItems(JSON.parse(value));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("타임테이블 형식이 올바르지 않습니다");
    }
    throw error;
  }
}
