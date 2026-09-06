import { describe, expect, it } from "vitest";
import {
  parseComment,
  validateImageFile,
  MAX_CONTENT_IMAGE_SIZE,
  contentImageUrl,
} from "../content-images";
const user = "11111111-1111-4111-8111-111111111111";
const path = `${user}/22222222-2222-4222-8222-222222222222.png`;
describe("image content validation", () => {
  it("accepts image-only comments and preserves legacy text", () => {
    expect(parseComment("", [path], user)).toEqual({
      body: "",
      image_paths: [path],
    });
    expect(parseComment(" 기존 댓글 ", undefined, user)).toEqual({
      body: "기존 댓글",
      image_paths: [],
    });
    expect(parseComment("내용", [path, path], user).image_paths).toHaveLength(
      1,
    );
  });
  it("rejects empty, malformed, external and other-owner attachments", () => {
    for (const paths of [
      [],
      ["https://evil.example/image.png"],
      [path.replace(user, "33333333-3333-4333-8333-333333333333")],
      ["../private.png"],
      [null],
    ])
      expect(() => parseComment("", paths, user)).toThrow();
    expect(() => parseComment({}, [], user)).toThrow();
    expect(contentImageUrl("javascript:alert(1)")).toBe("");
  });
  it("enforces format and file size", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"])
      expect(() =>
        validateImageFile({ type, size: MAX_CONTENT_IMAGE_SIZE }),
      ).not.toThrow();
    expect(() =>
      validateImageFile({ type: "image/svg+xml", size: 1 }),
    ).toThrow();
    expect(() => validateImageFile({ type: "image/png", size: 0 })).toThrow();
    expect(() =>
      validateImageFile({
        type: "image/png",
        size: MAX_CONTENT_IMAGE_SIZE + 1,
      }),
    ).toThrow();
  });
});
