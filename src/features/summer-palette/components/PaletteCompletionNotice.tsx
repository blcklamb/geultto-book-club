"use client";

import { Trophy } from "lucide-react";

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
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">
            아홉 칸을 모두 채웠습니다.
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            이제 여름 책 팔레트를 PNG 이미지로 저장할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
