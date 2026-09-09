import { describe, expect, it } from "vitest";
import {
  parseComment,
  validateImageFile,
  MAX_CONTENT_IMAGE_SIZE,
  contentImageUrl,
  parsePostImagePaths,
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
    expect(() =>
      parseComment("", [path, path.replace("22222222", "33333333")], user),
    ).toThrow("최대 1개");
    expect(contentImageUrl("javascript:alert(1)")).toBe("");
  });
  it("allows at most three owned images in post content", () => {
    const image = (id: string) => ({
      type: "image",
      attrs: {
        src: `https://storage.test/storage/v1/object/public/content-images/${user}/${id}.png`,
      },
    });
    const content = {
      type: "doc",
      content: [image("22222222-2222-4222-8222-222222222222")],
    };
    expect(parsePostImagePaths(content, user)).toEqual([path]);
    expect(() => parsePostImagePaths({ type: "doc", content: Array(4).fill(content.content[0]) }, user)).toThrow("최대 3개");
    expect(() =>
      parsePostImagePaths(
        {
          type: "doc",
          content: [
            image("22222222-2222-4222-8222-222222222222"),
            image("33333333-3333-4333-8333-333333333333"),
            image("44444444-4444-4444-8444-444444444444"),
            image("55555555-5555-4555-8555-555555555555"),
          ],
        },
        user,
      ),
    ).toThrow("최대 3개");
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
