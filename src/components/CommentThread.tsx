"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalizedDate } from "@/components/LocalizedDate";
import { UserAvatar } from "@/components/UserAvatar";

export type CommentThreadProps = {
  comments: Array<{
    id: string;
    author: string;
    authorImageUrl?: string | null;
    authorDecoration?: string | null;
    body: string;
    createdAt: string | null | undefined;
  }>;
  submitAction: (body: string) => Promise<void>;
  disabled?: boolean;
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  submitAction,
  disabled,
}) => {
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
          <Card key={comment.id}>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
