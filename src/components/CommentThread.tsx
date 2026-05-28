"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalizedDate } from "@/components/LocalizedDate";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";

export type CommentReply = {
  id: string;
  author: string;
  authorImageUrl?: string | null;
  authorDecoration?: string | null;
  body: string;
  createdAt: string | null | undefined;
};

export type CommentThreadProps = {
  comments: Array<{
    id: string;
    author: string;
    authorImageUrl?: string | null;
    authorDecoration?: string | null;
    body: string;
    createdAt: string | null | undefined;
    replies?: CommentReply[];
  }>;
  submitAction: (body: string) => Promise<void>;
  submitReplyAction?: (commentId: string, body: string) => Promise<void>;
  disabled?: boolean;
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  submitAction,
  submitReplyAction,
  disabled,
}) => {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await submitAction(value);
      router.refresh();
      setValue("");
      setFeedback({ type: "success", message: "댓글이 등록되었습니다." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "댓글 등록에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">댓글</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {feedback?.type === "error" ? (
            <Alert variant="destructive">
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}
          {feedback?.type === "success" ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CircleCheck className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}
          <Textarea
            placeholder="느낀 점을 남겨보세요"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || isSubmitting}
          />
          <Button onClick={handleSubmit} disabled={disabled || isSubmitting}>
            댓글 등록
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            disabled={disabled}
            onAddReply={
              submitReplyAction
                ? (body) => submitReplyAction(comment.id, body)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

type CommentItemProps = {
  comment: CommentThreadProps["comments"][number];
  disabled?: boolean;
  onAddReply?: (body: string) => Promise<void>;
};

function CommentItem({ comment, disabled, onAddReply }: CommentItemProps) {
  const router = useRouter();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyBody.trim() || !onAddReply) return;
    setIsSubmitting(true);
    try {
      await onAddReply(replyBody.trim());
      router.refresh();
      setReplyBody("");
      setShowReplyForm(false);
      toast.success("답글이 등록되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "답글 작성 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-1 text-sm p-4">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <UserAvatar
            imageUrl={comment.authorImageUrl}
            decoration={comment.authorDecoration}
            size="sm"
          />
          <span>{comment.author}</span>
        </div>
        <p className="text-slate-600">{comment.body}</p>
        <p className="text-xs text-slate-400">
          <LocalizedDate
            value={comment.createdAt}
            options={{ dateStyle: "medium", timeStyle: "short" }}
          />
        </p>

        {(comment.replies ?? []).length > 0 && (
          <div className="ml-3 mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
            {(comment.replies ?? []).map((reply) => (
              <div key={reply.id} className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <UserAvatar
                    imageUrl={reply.authorImageUrl}
                    decoration={reply.authorDecoration}
                    size="sm"
                  />
                  <span>{reply.author}</span>
                </div>
                <p className="text-xs text-slate-600">{reply.body}</p>
                <p className="text-xs text-slate-400">
                  <LocalizedDate
                    value={reply.createdAt}
                    options={{ dateStyle: "medium", timeStyle: "short" }}
                  />
                </p>
              </div>
            ))}
          </div>
        )}

        {!disabled && onAddReply && (
          <div className="pt-1">
            {showReplyForm ? (
              <div className="mt-2 space-y-1.5">
                <Textarea
                  placeholder="답글을 입력하세요"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="text-xs"
                  rows={2}
                />
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
