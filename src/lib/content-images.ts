export const CONTENT_IMAGE_BUCKET = "content-images";
export const MAX_CONTENT_IMAGE_SIZE = 5 * 1024 * 1024;
export const CONTENT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const CONTENT_IMAGE_ACCEPT = CONTENT_IMAGE_TYPES.join(",");
const pathPattern = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i;

export function validateImageFile(file: Pick<File, "size" | "type">) {
  if (!CONTENT_IMAGE_TYPES.includes(file.type))
    throw new Error("JPEG·PNG·WebP·GIF 이미지만 첨부할 수 있습니다.");
  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > MAX_CONTENT_IMAGE_SIZE
  )
    throw new Error("이미지는 파일당 5MB 이하만 첨부할 수 있습니다.");
}

export function contentImageUrl(path: string) {
  if (!pathPattern.test(path)) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CONTENT_IMAGE_BUCKET}/${path}`;
}

export function parseComment(
  body: unknown,
  images: unknown = [],
  userId: string,
) {
  if (
    typeof body !== "string" ||
    !Array.isArray(images) ||
    images.some(
      (path) =>
        typeof path !== "string" ||
        !pathPattern.test(path) ||
        !path.startsWith(`${userId}/`),
    )
  ) {
    throw new Error("댓글 또는 이미지 정보가 올바르지 않습니다.");
  }
  const imagePaths = [...new Set(images as string[])];
  if (!body.trim() && imagePaths.length === 0)
    throw new Error("댓글 내용이나 이미지를 입력해주세요.");
  return { body: body.trim(), image_paths: imagePaths };
}

export function imageSignatureMatches(type: string, bytes: number[]) {
  if (
    bytes.length < 6 ||
    bytes.length > 12 ||
    bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
  )
    return false;
  const signature = bytes.map((n) => n.toString(16).padStart(2, "0")).join("");
  return type === "image/jpeg"
    ? signature.startsWith("ffd8ff")
    : type === "image/png"
      ? signature.startsWith("89504e470d0a1a0a")
      : type === "image/gif"
        ? signature.startsWith("474946383761") ||
          signature.startsWith("474946383961")
        : type === "image/webp" &&
          signature.startsWith("52494646") &&
          signature.slice(16, 24) === "57454250";
}
