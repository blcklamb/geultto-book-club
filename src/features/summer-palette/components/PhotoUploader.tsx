"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Images, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resizeImageFile } from "../hooks/useImageResize";
import type { CellPhoto } from "../types";

type PhotoUploaderProps = {
  onPhotoReady: (photo: CellPhoto) => void;
  isUploadAllowed?: boolean;
};

export function PhotoUploader({
  onPhotoReady,
  isUploadAllowed = true,
}: PhotoUploaderProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  function requestPhoto(inputRef: React.RefObject<HTMLInputElement | null>) {
    if (!isUploadAllowed) {
      setLoginDialogOpen(true);
      return;
    }

    inputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!isUploadAllowed) {
      setLoginDialogOpen(true);
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 첨부할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const photo = await resizeImageFile(file);
      onPhotoReady(photo);
    } catch (err) {
      console.error(err);
      setError("이미지를 처리하지 못했습니다. 다른 사진으로 다시 시도해주세요.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  return (
    <>
      <div className="space-y-2">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />
        {isProcessing ? (
          <Button type="button" variant="outline" className="w-full" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            사진 처리 중
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => requestPhoto(cameraInputRef)}
            >
              <Camera className="h-4 w-4" />
              사진 촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => requestPhoto(galleryInputRef)}
            >
              <Images className="h-4 w-4" />
              갤러리 선택
            </Button>
          </div>
        )}
        {error ? (
          <p className="text-xs text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>로그인이 필요합니다</DialogTitle>
            <DialogDescription>
              여름 팔레트에 사진을 업로드하려면 먼저 로그인해주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild>
              <Link href="/auth/login">로그인</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
