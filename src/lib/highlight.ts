import type { ReactionSummary } from "./reactions";

export type HighlightReply = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

export type HighlightComment = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  reactions: ReactionSummary[];
  replies: HighlightReply[];
};

export type HighlightWithComments = {
  id: string;
  highlightText: string;
  authorNickname: string;
  startPos: number;
  endPos: number;
  comments: HighlightComment[];
};
