export type ReviewSelection = {
  anchor: number;
  head: number;
  text: string;
};

/** Resolve DOM boundaries without importing ProseMirror on the reading path. */
export function reviewPositionAtDOM(root: HTMLElement, node: Node, offset: number): number | null {
  if (!root.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    const leaf = node.parentElement?.closest<HTMLElement>("[data-pm-text]");
    if (!leaf) return null;
    return Number(leaf.dataset.pmStart) + offset;
  }
  if (!(node instanceof HTMLElement)) return null;
  const child = node.childNodes[offset];
  if (child) {
    if (child.nodeType === Node.TEXT_NODE) return reviewPositionAtDOM(root, child, 0);
    if (child instanceof HTMLElement) {
      const first = child.matches("[data-pm-start]") ? child : child.querySelector<HTMLElement>("[data-pm-start]");
      if (first) return Number(first.dataset.pmStart);
    }
  }
  const previous = node.childNodes[offset - 1];
  if (previous) {
    if (previous.nodeType === Node.TEXT_NODE) return reviewPositionAtDOM(root, previous, previous.textContent?.length ?? 0);
    if (previous instanceof HTMLElement) {
      const last = previous.matches("[data-pm-end]") ? previous : Array.from(previous.querySelectorAll<HTMLElement>("[data-pm-end]")).at(-1);
      if (last) return Number(last.dataset.pmEnd);
    }
  }
  if (node.hasAttribute("data-pm-start")) {
    return Number(node.dataset.pmStart) + (node.hasAttribute("data-pm-container") ? 1 : 0);
  }
  return null;
}

export function captureReviewSelection(root: HTMLElement, selection: Selection | null): ReviewSelection | null {
  if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) return null;
  const anchor = reviewPositionAtDOM(root, selection.anchorNode, selection.anchorOffset);
  const head = reviewPositionAtDOM(root, selection.focusNode, selection.focusOffset);
  const text = selection.toString().trim();
  return anchor != null && head != null && anchor !== head && text ? { anchor, head, text } : null;
}
