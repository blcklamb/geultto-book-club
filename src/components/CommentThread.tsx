"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";

export type CommentThreadProps = {
  comments: Array<{
    id: string;
    author: string;
    authorImageUrl?: string | null;
    body: string;
    createdAt: string;
  }>;
  onSubmit?: (body: string) => Promise<void>;
  disabled?: boolean;
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  onSubmit,
  disabled,
}) => {
  const [value, setValue] = useState("");
  const handleSubmit = async () => {
    if (!value.trim()) return;
    await onSubmit?.(value);
    setValue("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">댓글</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="느낀 점을 남겨보세요"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          />
          <Button onClick={handleSubmit} disabled={disabled}>
            댓글 등록
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="space-y-1 text-sm p-4">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <UserAvatar imageUrl={comment.authorImageUrl} size="sm" />
                <span>{comment.author}</span>
              </div>
              <p className="text-slate-600">{comment.body}</p>
              <p className="text-xs text-slate-400">{comment.createdAt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
