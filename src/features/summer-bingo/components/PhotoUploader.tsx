"use client";

import { useRef, useState } from "react";
import { Camera, Images, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resizeImageFile } from "../hooks/useImageResize";
import type { CellPhoto } from "../types";

type PhotoUploaderProps = {
  onPhotoReady: (photo: CellPhoto) => void;
};

export function PhotoUploader({ onPhotoReady }: PhotoUploaderProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            사진 촬영
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => galleryInputRef.current?.click()}
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
  );
}
