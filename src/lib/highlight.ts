import type { ReactionSummary } from "./reactions";

export type HighlightReply = {
  id: string;
  body: string;
  author: string;
  authorImageUrl?: string | null;
  createdAt: string;
};

export type HighlightComment = {
  id: string;
  body: string;
  author: string;
  authorImageUrl?: string | null;
  createdAt: string;
  reactions: ReactionSummary[];
  replies: HighlightReply[];
};

export type HighlightWithComments = {
  id: string;
  highlightText: string;
  authorId: string;
  authorNickname: string;
  authorImageUrl?: string | null;
  startPos: number;
  endPos: number;
  comments: HighlightComment[];
};

// Deterministic pastel color per highlight id.
// Semi-transparent so overlapping highlights stack visibly in the DOM
// (TipTap renders overlaps as nested <mark> elements).
export function highlightColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsla(${hue}, 85%, 72%, 0.4)`;
}
