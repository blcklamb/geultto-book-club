"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { EmojiReactionBar } from "@/components/EmojiReactionBar";
import type {
  HighlightWithComments,
  HighlightComment,
  HighlightReply,
} from "@/lib/highlight";
import type { ReactionSummary } from "@/lib/reactions";

export type { HighlightWithComments };

type HighlightCommentPanelProps = {
  highlight: HighlightWithComments;
  disabled?: boolean;
  currentUserNickname?: string;
  currentUserId?: string;
  onClose: () => void;
  onHighlightDeleted: (id: string) => void;
  onCommentsUpdated: (updated: HighlightWithComments) => void;
};

export function HighlightCommentPanel({
  highlight,
  disabled,
  currentUserNickname,
  onClose,
  onHighlightDeleted,
  onCommentsUpdated,
}: HighlightCommentPanelProps) {
  const [comments, setComments] = useState<HighlightComment[]>(
    highlight.comments
  );
  const [newCommentBody, setNewCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitComment = async () => {
    if (!newCommentBody.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/highlights/${highlight.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newCommentBody.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "댓글 작성 실패");
      }
      const created: HighlightComment = await res.json();
      const updated = [...comments, created];
      setComments(updated);
      setNewCommentBody("");
      onCommentsUpdated({ ...highlight, comments: updated });
    } catch (e) {
      setError(e instanceof Error ? e.message : "댓글 작성 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHighlight = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/highlights/${highlight.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "하이라이트 삭제 실패");
      }
      onHighlightDeleted(highlight.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "하이라이트 삭제 실패");
    }
  };

  const handleToggleReaction = useCallback(
    async (commentId: string, emoji: string): Promise<ReactionSummary[]> => {
      const res = await fetch(
        `/api/highlights/comments/${commentId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        }
      );
      if (!res.ok) throw new Error("반응 저장 실패");
      const updated: ReactionSummary[] = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, reactions: updated } : c
        )
      );
      return updated;
    },
    []
  );

  const handleAddReply = async (commentId: string, body: string) => {
    const res = await fetch(
      `/api/highlights/comments/${commentId}/replies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? "답글 작성 실패");
    }
    const created: HighlightReply = await res.json();
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, created] } : c
      )
    );
  };

  const isHighlightAuthor =
    highlight.authorNickname === currentUserNickname;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader className="pr-6">
          <SheetTitle className="text-sm font-semibold">
            하이라이트 댓글
          </SheetTitle>
          <blockquote className="mt-2 border-l-4 border-yellow-400 bg-yellow-50 py-2 pl-3 pr-2 text-sm text-slate-700 italic">
            &ldquo;{highlight.highlightText}&rdquo;
          </blockquote>
          <p className="text-xs text-slate-500">
            {highlight.authorNickname} 님이 하이라이트함
          </p>
          {isHighlightAuthor && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-6 w-fit px-2 text-xs text-red-500 hover:text-red-700"
              onClick={handleDeleteHighlight}
            >
              하이라이트 삭제
            </Button>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-6">
          {comments.length === 0 ? (
            <p className="text-center text-xs text-slate-400">
              첫 댓글을 남겨보세요
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                disabled={disabled}
                currentUserNickname={currentUserNickname}
                onToggleReaction={(emoji) =>
                  handleToggleReaction(comment.id, emoji)
                }
                onAddReply={(body) => handleAddReply(comment.id, body)}
              />
            ))
          )}

          {!disabled && (
            <div className="space-y-2 border-t pt-4">
              <Textarea
                placeholder="이 구절에 대한 생각을 남겨보세요"
                value={newCommentBody}
                onChange={(e) => setNewCommentBody(e.target.value)}
                className="text-sm"
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newCommentBody.trim()}
              >
                댓글 등록
              </Button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type CommentItemProps = {
  comment: HighlightComment;
  disabled?: boolean;
  currentUserNickname?: string;
  onToggleReaction: (emoji: string) => Promise<ReactionSummary[]>;
  onAddReply: (body: string) => Promise<void>;
};

function CommentItem({
  comment,
  disabled,
  currentUserNickname,
  onToggleReaction,
  onAddReply,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleSubmitReply = async () => {
    if (!replyBody.trim()) return;
    setIsSubmitting(true);
    setReplyError(null);
    try {
      await onAddReply(replyBody.trim());
      setReplyBody("");
      setShowReplyForm(false);
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "답글 작성 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-700">{comment.author}</p>
          <p className="text-sm text-slate-600">{comment.body}</p>
          <p className="text-xs text-slate-400">{comment.createdAt}</p>
        </div>

        <EmojiReactionBar
          initialReactions={comment.reactions}
          onToggle={onToggleReaction}
          disabled={disabled}
          currentUserNickname={currentUserNickname}
        />

        {comment.replies.length > 0 && (
          <div className="ml-3 space-y-2 border-l-2 border-slate-100 pl-3">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="space-y-0.5">
                <p className="text-xs font-medium text-slate-700">
                  {reply.author}
                </p>
                <p className="text-xs text-slate-600">{reply.body}</p>
                <p className="text-xs text-slate-400">{reply.createdAt}</p>
              </div>
            ))}
          </div>
        )}

        {!disabled && (
          <div>
            {showReplyForm ? (
              <div className="mt-2 space-y-1.5">
                <Textarea
                  placeholder="답글을 입력하세요"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="text-xs"
                  rows={2}
                />
                {replyError && (
                  <p className="text-xs text-red-600" role="alert">
                    {replyError}
                  </p>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleSubmitReply}
                    disabled={isSubmitting || !replyBody.trim()}
                  >
                    등록
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyBody("");
                      setReplyError(null);
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-slate-500"
                onClick={() => setShowReplyForm(true)}
              >
                답글 달기
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
