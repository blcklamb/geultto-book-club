import "@/styles/tiptap.css";
import { cloneElement, type ReactElement } from "react";
import { getSchema, getAttributesFromExtensions, splitExtensions, type JSONContent } from "@tiptap/core";
import { Transform } from "@tiptap/pm/transform";
import type { Node as PMNode } from "@tiptap/pm/model";
import { reviewViewerExtensions } from "./review-viewer-extensions";
import { sanitizeContent } from "./tiptap/sanitize";
import { resolveExtensions } from "./tiptap/internal/utils";
import { renderToReactElement, domOutputSpecToReactElement, mapNodeExtensionToReactNode } from "./tiptap/internal/pm/react";
import { highlightColorFor, type HighlightWithComments } from "@/lib/highlight";
import { ReviewViewerLazy } from "./ReviewViewerLazy";

export type ReviewReadViewProps = {
  content: JSONContent;
  reviewId: string;
  initialHighlights: HighlightWithComments[];
  disabled?: boolean;
  currentUserNickname?: string;
  currentUserId?: string;
};

export function renderReviewReadContent(content: JSONContent, highlights: HighlightWithComments[]) {
  const extensions = reviewViewerExtensions();
  const schema = getSchema(extensions);
  const normalizedContent = sanitizeContent(content, extensions);
  const doc = schema.nodeFromJSON(normalizedContent);
  const transform = new Transform(doc);
  for (const h of highlights) {
    if (!Number.isInteger(h.startPos) || !Number.isInteger(h.endPos) || h.startPos < 1 || h.endPos > doc.content.size || h.startPos >= h.endPos) continue;
    transform.addMark(h.startPos, h.endPos, schema.marks.highlight.create({
      highlightId: h.id, color: highlightColorFor(h.id),
    }));
  }
  // Build positions after splitting text at mark boundaries. Marks never change node sizes.
  const positions = new WeakMap<PMNode, number>();
  transform.doc.descendants((node, pos) => { positions.set(node, pos); });
  const resolved = resolveExtensions(extensions);
  const attributes = getAttributesFromExtensions(resolved);
  const nodeMapping = Object.fromEntries(splitExtensions(resolved).nodeExtensions.filter(ext => ext.name !== "doc" && ext.name !== "text").map(ext => {
    const [name, render] = mapNodeExtensionToReactNode<React.ReactNode>(domOutputSpecToReactElement, ext, attributes);
    return [name, (props: Parameters<typeof render>[0]) => {
      const pos = positions.get(props.node)!;
      return cloneElement(render(props) as ReactElement<Record<string, unknown>>, {
        "data-pm-start": pos, "data-pm-end": pos + props.node.nodeSize,
        ...(!props.node.isLeaf ? { "data-pm-container": "" } : {}),
      });
    }];
  }));
  const body = renderToReactElement({
    content: transform.doc, extensions, rootClassName: "tiptap-editor",
    options: {
      nodeMapping: {
        ...nodeMapping,
        text: ({ node }) => <span data-pm-text="" data-pm-start={positions.get(node)} data-pm-end={positions.get(node)! + node.nodeSize}>{node.text}</span>,
      },
    },
  });
  return { content: normalizedContent as JSONContent, body };
}

export function ReviewReadView(props: ReviewReadViewProps) {
  const { content, body } = renderReviewReadContent(props.content, props.initialHighlights);
  return <ReviewViewerLazy {...props} content={content}>{body}</ReviewViewerLazy>;
}
