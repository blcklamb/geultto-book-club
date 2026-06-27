import { describe, expect, it } from "vitest";
import { formatPhotoTimestamp } from "../useImageResize";

describe("summer bingo image resize helpers", () => {
  it("formats photo timestamps as MM.DD.hh.MM", () => {
    const timestamp = formatPhotoTimestamp(new Date(2026, 5, 8, 9, 7));

    expect(timestamp).toBe("06.08.09.07");
  });
});
