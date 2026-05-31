export const MIN_RICH_TEXT_CHARS = 500;

export function extractPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractPlainText).join("");
  }
  return "";
}

export function richTextMinCharsMessage(
  entityName: string,
  charCount: number,
  minChars = MIN_RICH_TEXT_CHARS,
) {
  return `${entityName}은 최소 ${minChars}자 이상 작성해야 합니다. (현재 ${charCount}자)`;
}
