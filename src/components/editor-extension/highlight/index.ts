import Highlight from "@tiptap/extension-highlight";

/**
 * Extends the built-in Highlight mark to carry a `highlightId` attribute.
 * This allows each highlighted span in the rendered HTML to reference the
 * corresponding row in the `review_highlights` DB table via
 * `data-highlight-id`.
 */
export const ReviewHighlightMark = Highlight.extend({
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
