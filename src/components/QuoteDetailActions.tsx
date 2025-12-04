"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Textarea } from "@/components/ui/textarea";

type QuoteDetailActionsProps = {
  quoteId: string;
  initialText: string;
  initialPageNumber: string;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
};

export const QuoteDetailActions: React.FC<QuoteDetailActionsProps> = ({
  quoteId,
  initialText,
  initialPageNumber,
  onUpdate,
  onDelete,
}) => {
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구절 수정</DialogTitle>
            <DialogDescription>
              구절 내용과 쪽수를 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <form action={onUpdate} className="space-y-4">
            <input type="hidden" name="quoteId" value={quoteId} />
            <div className="space-y-2 text-sm">
              <label className="space-y-1">
                <span className="text-slate-600">인상 깊은 구절</span>
                <Textarea
                  name="text"
                  defaultValue={initialText}
                  required
                  placeholder="책에서 인상 깊었던 문장을 입력하세요"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-600">쪽수</span>
                <Input
                  name="pageNumber"
                  defaultValue={initialPageNumber}
                  placeholder="123"
                  inputMode="numeric"
                />
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
            <DialogTitle>구절 삭제</DialogTitle>
            <DialogDescription>
              이 구절을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <form action={onDelete}>
            <input type="hidden" name="quoteId" value={quoteId} />
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
};
