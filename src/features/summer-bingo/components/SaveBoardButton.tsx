"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BingoBoard } from "../types";

type SaveBoardButtonProps = {
  board: BingoBoard;
  canSave: boolean;
  isExporting: boolean;
  onSave: (board: BingoBoard) => void;
};

export function SaveBoardButton({
  board,
  canSave,
  isExporting,
  onSave,
}: SaveBoardButtonProps) {
  function handleClick() {
    if (isExporting) {
      return;
    }

    if (!canSave) {
      window.alert("완성 시 다운로드 가능합니다");
      return;
    }

    onSave(board);
  }

  return (
    <Button
      type="button"
      className={cn(
        "w-full",
        !canSave &&
          "bg-slate-300 text-slate-700 shadow-none hover:bg-slate-300",
      )}
      aria-disabled={!canSave || isExporting}
      disabled={isExporting}
      onClick={handleClick}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          이미지 생성 중
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          빙고 판 저장
        </>
      )}
    </Button>
  );
}
