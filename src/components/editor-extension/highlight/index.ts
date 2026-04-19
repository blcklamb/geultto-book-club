import Highlight from "@tiptap/extension-highlight";

/**
 * Extends the built-in Highlight mark to carry a `highlightId` attribute.
 * This allows each highlighted span in the rendered HTML to reference the
 * corresponding row in the `review_highlights` DB table via
 * `data-highlight-id`.
 */
export const ReviewHighlightMark = Highlight.extend({
  // Allow multiple highlight marks (with different ids) to coexist on the
  // same range. Default excludes is "_" which makes same-type marks replace
  // each other — that would break subset overlaps on delete.
  excludes: "",

  addAttributes() {
    return {
      ...this.parent?.(),
      highlightId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-highlight-id"),
        renderHTML: (attributes) => {
          if (!attributes.highlightId) return {};
          return { "data-highlight-id": attributes.highlightId };
        },
      },
    };
  },
});
