"use client";
import { useRef, useState, type ReactNode, type DragEvent } from "react";
import { CONTENT_IMAGE_ACCEPT, contentImageUrl } from "@/lib/content-images";
import type { ImageUploads } from "@/hooks/useImageUploads";
import { Button } from "./ui/button";

export function ImageAttachments({
  uploads,
  disabled,
  children,
  hideCompleted = false,
  onFileDrop,
  maxImages = 1,
}: {
  onFileDrop?: (event: DragEvent<HTMLDivElement>) => void;
  uploads: ImageUploads;
  disabled?: boolean;
  children?: ReactNode;
  hideCompleted?: boolean;
  maxImages?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [limitMessage, setLimitMessage] = useState("");
  const add = (files: File[]) => {
    const result = uploads.add(files);
    setLimitMessage(
      result.exceeded
        ? `이미지는 최대 ${maxImages}개까지 첨부할 수 있습니다.`
        : "",
    );
  };
  return (
    <div
      className="space-y-2"
      onPasteCapture={(event) => {
        const files = Array.from(event.clipboardData.files);
        if (!disabled && files.length) {
          event.preventDefault();
          event.stopPropagation();
          add(files);
        }
      }}
      onDragOver={(event) => {
        if (!disabled && event.dataTransfer.types.includes("Files"))
          event.preventDefault();
      }}
      onDropCapture={(event) => {
        const files = Array.from(event.dataTransfer.files);
        if (!disabled && files.length) {
          event.preventDefault();
          event.stopPropagation();
          onFileDrop?.(event);
          add(files);
        }
      }}
    >
      {children}
      <input
        ref={input}
        type="file"
        className="hidden"
        aria-label="첨부할 이미지 선택"
        accept={CONTENT_IMAGE_ACCEPT}
        multiple
        disabled={disabled}
        onChange={(event) => {
          add(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        이미지 첨부 ({uploads.items.length}/{maxImages})
      </Button>
      {limitMessage ? (
        <p role="alert" className="text-xs text-red-600">
          {limitMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {uploads.items
          .filter((item) => !hideCompleted || item.status !== "done")
          .map((item) => (
            <div key={item.id} className="max-w-48 rounded border p-2 text-xs">
              <img
                src={item.preview}
                alt={item.file.name}
                className="h-20 w-28 object-contain"
              />
              {item.status === "uploading" && <span role="status">업로드 중…</span>}
              {item.status === "removing" && <span role="status">제거 중…</span>}
              {item.error && (
                <div role="alert">
                  {item.error}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                      item.removalFailed
                        ? void uploads.remove(item.id)
                        : void uploads.retry(item)
                    }
                  >
                    {item.removalFailed ? "제거 재시도" : "재시도"}
                  </Button>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || item.status === "removing"}
                aria-label={`${item.file.name} 첨부 제거`}
                onClick={() => void uploads.remove(item.id)}
              >
                제거
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}

export function CommentImages({ paths = [] }: { paths?: string[] }) {
  return paths.length ? (
    <div className="flex flex-wrap gap-2 py-2">
      {paths.map((path) => {
        const url = contentImageUrl(path);
        return url ? (
          <a key={path} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt="댓글 첨부 이미지"
              loading="lazy"
              className="max-h-64 max-w-full rounded-md object-contain"
            />
          </a>
        ) : null;
      })}
    </div>
  ) : null;
}
