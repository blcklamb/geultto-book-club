"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ReviewEditor } from "@/components/ReviewEditor";

type TopicDetailActionsProps = {
  topicId: string;
  initialTitle: string;
  initialContent: JSONContent | string;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
};

export function TopicDetailActions({
  topicId,
  initialTitle,
  initialContent,
  onUpdate,
  onDelete,
}: TopicDetailActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="더 보기"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-rose-600 focus:bg-rose-50"
            onSelect={() => setIsDeleteOpen(true)}
          >
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>발제 수정</DialogTitle>
            <DialogDescription>
              제목과 발제 내용을 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <form action={onUpdate} className="space-y-4">
            <input type="hidden" name="topicId" value={topicId} />
            <div className="space-y-2 text-sm">
              <label className="space-y-1 block">
                <span className="text-slate-600">제목</span>
                <Input name="title" defaultValue={initialTitle} required />
              </label>
              <label className="space-y-1 block">
                <span className="text-slate-600">내용</span>
                <div className="rounded-md border p-2">
                  <ReviewEditor
                    name="bodyRich"
                    defaultContent={initialContent}
                  />
                </div>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                onClick={() => {
                  setIsEditOpen(false);
                }}
              >
                저장하기
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>발제 삭제</DialogTitle>
            <DialogDescription>
              이 발제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <form action={onDelete}>
            <input type="hidden" name="topicId" value={topicId} />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" variant="destructive">
                삭제
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
