"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressListItem } from "./components/ProgressListItem";
import { PaletteBoard } from "./components/PaletteBoard";
import { PaletteCompletionNotice } from "./components/PaletteCompletionNotice";
import { CellEditSheet } from "./components/CellEditSheet";
import { SaveBoardButton } from "./components/SaveBoardButton";
import { usePaletteBoard } from "./hooks/usePaletteBoard";
import { useImageExport } from "./hooks/useImageExport";

export function SummerPalettePage() {
  const {
    board,
    isLoaded,
    storageError,
    serverError,
    syncLabel,
    stats,
    updatePhoto,
    clearPhoto,
    resetBoard,
  } = usePaletteBoard();
  const { exportBoard, isExporting, error: exportError } = useImageExport();
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null,
  );

  const progressPercent = Math.round(
    (stats.filledCount / board.cells.length) * 100,
  );
  const selectedCell =
    selectedCellIndex === null ? null : board.cells[selectedCellIndex] ?? null;

  function handleReset() {
    if (window.confirm("현재 팔레트 진행 상태를 모두 비울까요?")) {
      resetBoard();
      setSelectedCellIndex(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            여름 독서 챌린지
          </Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              여름 책 팔레트
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              아홉 가지 여름 독서 장면을 사진으로 채우고 한 장의 기록으로
              저장하세요. 로그인하면 같은 계정의 다른 기기에서도 이어서 볼 수
              있습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:w-[360px]">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-slate-500">완료</p>
            <p className="text-lg font-bold text-slate-900">
              {stats.filledCount}/9
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-slate-500">팔레트</p>
            <p className="text-lg font-bold text-slate-900">
              {stats.isFullClear ? "완성" : "진행"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-slate-500">진행률</p>
            <p className="text-lg font-bold text-slate-900">
              {progressPercent}%
            </p>
          </div>
        </div>
      </section>

      <PaletteCompletionNotice isFullClear={stats.isFullClear} />

      {storageError ? (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {storageError}
        </p>
      ) : null}
      {serverError ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {serverError}
        </p>
      ) : null}
      {exportError ? (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {exportError}
        </p>
      ) : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PaletteBoard
          board={board}
          onSelectCell={(cell) => setSelectedCellIndex(cell.index)}
        />

        <aside className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-900">진행 상태</span>
              <span className="text-slate-500">
                {isLoaded ? syncLabel : "불러오는 중"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {board.cells.map((cell) => (
              <ProgressListItem key={cell.id} cell={cell} />
            ))}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <SaveBoardButton
              board={board}
              canSave={stats.isFullClear}
              isExporting={isExporting}
              onSave={exportBoard}
            />
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-600"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              처음부터
            </Button>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-4 z-30 lg:hidden">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <SaveBoardButton
            board={board}
            canSave={stats.isFullClear}
            isExporting={isExporting}
            onSave={exportBoard}
          />
        </div>
      </div>

      <CellEditSheet
        cell={selectedCell}
        open={Boolean(selectedCell)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCellIndex(null);
          }
        }}
        onPhotoChange={updatePhoto}
        onPhotoRemove={clearPhoto}
      />
    </div>
  );
}
