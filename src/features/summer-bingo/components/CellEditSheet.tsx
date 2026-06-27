"use client";

import { Check, ImageOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PhotoUploader } from "./PhotoUploader";
import type { BingoCell, CellPhoto } from "../types";

type CellEditSheetProps = {
  cell: BingoCell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoChange: (cellIndex: number, photo: CellPhoto) => void;
  onPhotoRemove: (cellIndex: number) => void;
};

export function CellEditSheet({
  cell,
  open,
  onOpenChange,
  onPhotoChange,
  onPhotoRemove,
}: CellEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] max-w-2xl overflow-y-auto rounded-t-xl"
      >
        {cell ? (
          <>
            <SheetHeader className="pr-8 text-left">
              <SheetTitle>{cell.title}</SheetTitle>
              <SheetDescription>
                사진 1장을 촬영하거나 갤러리에서 선택할 수 있습니다.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {cell.photo ? (
                  <img
                    src={cell.photo.dataUrl}
                    alt=""
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-sm font-medium">사진 없음</span>
                  </div>
                )}
              </div>

              <PhotoUploader
                onPhotoReady={(photo) => onPhotoChange(cell.index, photo)}
              />
            </div>

            <SheetFooter className="gap-2 sm:gap-2">
              {cell.photo ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onPhotoRemove(cell.index)}
                >
                  <Trash2 className="h-4 w-4" />
                  사진 삭제
                </Button>
              ) : null}
              <SheetClose asChild>
                <Button type="button">
                  <Check className="h-4 w-4" />
                  완료
                </Button>
              </SheetClose>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
