"use client";

import { Sparkles, Trophy } from "lucide-react";

type BingoCelebrationProps = {
  completedLineCount: number;
  isFullClear: boolean;
};

export function BingoCelebration({
  completedLineCount,
  isFullClear,
}: BingoCelebrationProps) {
  if (completedLineCount === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
      <div className="flex items-start gap-3">
        {isFullClear ? (
          <Trophy className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {isFullClear
              ? "아홉 칸을 모두 채웠습니다."
              : `${completedLineCount}줄 빙고가 완성되었습니다.`}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {isFullClear
              ? "이제 빙고 판을 PNG 이미지로 저장할 수 있습니다."
              : "완성된 라인이 빙고 판 위에 표시됩니다."}
          </p>
        </div>
      </div>
    </div>
  );
}
