"use client";

import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { SUMMER_PALETTE_CELL_ACCENTS } from "../data/themes";
import { isCellFilled } from "../lib/paletteLogic";
import { formatPaletteTimestamp } from "../hooks/useImageResize";
import { usePaletteGallery } from "../hooks/usePaletteGallery";
import type { PaletteCell, PaletteGalleryItem } from "../types";

type PaletteGallerySectionProps = {
  canView: boolean;
};

export function PaletteGallerySection({ canView }: PaletteGallerySectionProps) {
  const { items, isLoading, error } = usePaletteGallery(canView);

  return (
    <section className="space-y-4 border-t border-slate-200 pt-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            다른 사람들의 팔레트
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            완성된 팔레트는 사진까지 볼 수 있고, 미완성 팔레트는 흐린
            미리보기만 표시됩니다.
          </p>
        </div>
      </div>

      {!canView ? (
        <PaletteGalleryNotice message="로그인한 승인 멤버만 다른 사람들의 팔레트를 볼 수 있습니다." />
      ) : isLoading ? (
        <PaletteGallerySkeleton />
      ) : error ? (
        <PaletteGalleryNotice message={error} tone="error" />
      ) : items.length === 0 ? (
        <PaletteGalleryNotice message="아직 다른 멤버가 저장한 팔레트가 없습니다." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <PaletteGalleryCard key={item.userId} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function PaletteGalleryCard({ item }: { item: PaletteGalleryItem }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            imageUrl={item.profileImageUrl}
            decoration={item.profileDecoration}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {item.nickname}
            </p>
            <p className="text-xs text-slate-500">
              {formatUpdatedAt(item.updatedAt)}
            </p>
          </div>
        </div>
        <Badge
          variant={item.isFullClear ? "default" : "secondary"}
          className="shrink-0"
        >
          {item.isFullClear ? "완성" : "미완성"}
        </Badge>
      </div>

      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-lg border border-orange-100 bg-orange-50">
          <div
            className={cn(
              "grid aspect-square grid-cols-3 gap-0 transition",
              !item.isFullClear && "blur-sm",
            )}
          >
            {item.board.cells.map((cell) => (
              <PaletteGalleryCell key={cell.id} cell={cell} />
            ))}
          </div>
          {!item.isFullClear ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/20">
              <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1 text-xs font-bold text-slate-800 shadow-sm">
                미완성
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-900">
            {item.filledCount}/9칸 완료
          </span>
          <span className="text-xs text-slate-500">여름 책 팔레트</span>
        </div>
      </div>
    </article>
  );
}

function PaletteGalleryCell({ cell }: { cell: PaletteCell }) {
  const filled = isCellFilled(cell);
  const accent = SUMMER_PALETTE_CELL_ACCENTS[cell.index] ?? "#f97316";

  return (
    <div className="relative aspect-square overflow-hidden border border-orange-100 bg-white">
      {cell.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cell.photo.dataUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `${accent}${filled ? "30" : "18"}` }}
        />
      )}

      {cell.photo ? (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <ImageOff className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-1.5",
          cell.photo ? "text-white" : "text-slate-700",
        )}
      >
        <p className="line-clamp-2 text-[10px] font-bold leading-tight">
          {cell.title}
        </p>
      </div>
    </div>
  );
}

function PaletteGallerySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-80 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}

function PaletteGalleryNotice({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-white text-slate-600",
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      {message}
    </p>
  );
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "업데이트 정보 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "업데이트 정보 없음";
  }

  return `${formatPaletteTimestamp(date)} 업데이트`;
}
