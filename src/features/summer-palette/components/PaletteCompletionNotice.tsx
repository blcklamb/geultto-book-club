"use client";

import { CircleCheck } from "lucide-react";

type PaletteCompletionNoticeProps = {
  isFullClear: boolean;
};

export function PaletteCompletionNotice({
  isFullClear,
}: PaletteCompletionNoticeProps) {
  if (!isFullClear) {
    return null;
  }

  return (
    <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-foreground" role="status">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-semibold">
            아홉 칸을 모두 채웠습니다.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            이제 여름 책 팔레트를 PNG 이미지로 저장할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
