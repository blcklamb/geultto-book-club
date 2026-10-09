import { getSchema, getText, getTextSerializersFromSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

export const MIN_RICH_TEXT_CHARS = 500;

// Match ReviewEditor's node types and Tiptap's plain text serialization, including breaks.
const textSchema = getSchema([StarterKit, Image]);
const textSerializers = getTextSerializersFromSchema(textSchema);

export function extractPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  return getText(textSchema.nodeFromJSON(node), { textSerializers });
}

export function richTextMinCharsMessage(
  entityName: string,
  charCount: number,
  minChars = MIN_RICH_TEXT_CHARS,
) {
  return `${entityName}은 최소 ${minChars}자 이상 작성해야 합니다. (현재 ${charCount}자)`;
}
