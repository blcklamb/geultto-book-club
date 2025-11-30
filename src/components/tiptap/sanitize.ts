import { type Extensions } from "@tiptap/core";

import { resolveExtensions } from "./internal/utils";

const getAllowedNodes = (extensions: Extensions) => {
  return new Set(extensions.map((ext) => ext.name));
};

const getAllowedMarks = (extensions: Extensions) => {
  return new Set(
    extensions.filter((ext) => ext.type === "mark").map((ext) => ext.name)
  );
};

const sanitizeDocIterative = (
  root: any,
  allowedNodes: Set<string>,
  allowedMarks: Set<string>
): any | null => {
  const clone = JSON.parse(JSON.stringify(root));
  const stack: any[] = [clone];

  while (stack.length > 0) {
    const node = stack.pop();

    // marks 필터링
    if (node.marks) {
      node.marks = node.marks.filter((mark: any) =>
        allowedMarks.has(mark.type)
      );
    }

    // content 처리
    if (Array.isArray(node.content)) {
      // 뒤에서 앞으로 순회하면 index 꼬임 방지
      for (let i = node.content.length - 1; i >= 0; i--) {
        const child = node.content[i];

        if (child.type && !allowedNodes.has(child.type)) {
          node.content.splice(i, 1);
          continue;
        }

        stack.push(child);
      }
    }
  }

  return clone;
};

export const sanitizeContent = (doc: any, extensions: Extensions) => {
  const resolvedExtensions = resolveExtensions(extensions);
  return sanitizeDocIterative(
    doc,
    getAllowedNodes(resolvedExtensions),
    getAllowedMarks(resolvedExtensions)
  );
};
