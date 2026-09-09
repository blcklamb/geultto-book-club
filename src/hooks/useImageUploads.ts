"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateImageFile } from "@/lib/content-images";

export type ImageUpload = {
  id: string;
  file: File;
  uploadId?: string;
  removalFailed?: boolean;
  preview: string;
  status: "uploading" | "removing" | "error" | "done";
  path?: string;
  url?: string;
  error?: string;
};
type UploadCallbacks = {
  onUploaded?: (image: { path: string; url: string }, id: string) => void;
  onAdded?: (id: string) => void;
  onRemoved?: (item: ImageUpload) => void;
};
type UploadOptions = UploadCallbacks & {
  maxItems?: number | ((items: ImageUpload[]) => number);
};

export function useImageUploads(options: UploadOptions = {}) {
  const [items, setItems] = useState<ImageUpload[]>([]);
  const itemsRef = useRef(items);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const mounted = useRef(true);
  const controllers = useRef(new Map<string, AbortController>());
  const update = useCallback((next: ImageUpload[]) => {
    itemsRef.current = next;
    if (mounted.current) setItems(next);
  }, []);
  const cancelUpload = async (id: string) => {
    try {
      await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        keepalive: true,
      });
    } catch { /* Expired drafts are retried by server cleanup. */ }
  };
  const run = async (item: ImageUpload) => {
    if (controllers.current.has(item.id)) return;
    const uploadId = crypto.randomUUID();
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    update(
      itemsRef.current.map((i) =>
        i.id === item.id ? { ...i, status: "uploading", error: undefined, uploadId } : i,
      ),
    );
    try {
      validateImageFile(item.file);
      const prepared = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", id: uploadId, type: item.file.type, size: item.file.size }),
        signal: controller.signal,
      });
      const preparation = await prepared.json();
      if (!prepared.ok) throw new Error(preparation.message ?? "이미지 업로드 실패");
      if (controller.signal.aborted) return;
      const uploaded = await fetch(preparation.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": item.file.type, "x-upsert": "false" },
        body: item.file,
        signal: controller.signal,
      });
      if (!uploaded.ok) throw new Error("이미지 업로드 실패. 다시 시도해주세요.");
      if (controller.signal.aborted) return;
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", id: uploadId }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "이미지 검증 실패");
      if (
        controller.signal.aborted ||
        !mounted.current ||
        !itemsRef.current.some((i) => i.id === item.id)
      ) {
        await cancelUpload(uploadId);
        return;
      }
      optionsRef.current.onUploaded?.(data, item.id);
      update(
        itemsRef.current.map((i) =>
          i.id === item.id
            ? { ...i, status: "done", path: data.path, url: data.url }
            : i,
        ),
      );
    } catch (error) {
      void cancelUpload(uploadId);
      if (!controller.signal.aborted)
        update(
          itemsRef.current.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  removalFailed: false,
                  error:
                    error instanceof Error
                      ? error.message
                      : "이미지 업로드 실패",
                }
              : i,
          ),
        );
    } finally {
      controllers.current.delete(item.id);
    }
  };
  const add = (files: File[]) => {
    const configuredMaximum = optionsRef.current.maxItems;
    const maximum = Math.max(
      0,
      typeof configuredMaximum === "function"
        ? configuredMaximum(itemsRef.current)
        : (configuredMaximum ?? Number.POSITIVE_INFINITY),
    );
    const available = Math.max(0, maximum - itemsRef.current.length);
    const next = files.slice(0, available).map(
      (file): ImageUpload => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "uploading",
      }),
    );
    for (const item of next) optionsRef.current.onAdded?.(item.id);
    update([...itemsRef.current, ...next]);
    // Preserve insertion order, including when several files are pasted at once.
    void (async () => {
      for (const item of next)
        if (itemsRef.current.some((i) => i.id === item.id)) await run(item);
    })();
    return { added: next.length, exceeded: next.length < files.length, maximum };
  };
  const remove = async (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item || item.status === "removing") return;
    controllers.current.get(id)?.abort();
    if (item.uploadId || item.path) {
      update(
        itemsRef.current.map((current) =>
          current.id === id
            ? { ...current, status: "removing", error: undefined }
            : current,
        ),
      );
      try {
        const response = await fetch("/api/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.uploadId, path: item.path }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message ?? "이미지를 제거하지 못했습니다.");
        }
      } catch (error) {
        update(
          itemsRef.current.map((current) =>
            current.id === id
              ? {
                  ...current,
                  status: "error",
                  removalFailed: true,
                  error:
                    error instanceof Error
                      ? error.message
                      : "이미지를 제거하지 못했습니다.",
                }
              : current,
          ),
        );
        return;
      }
    }
    optionsRef.current.onRemoved?.(item);
    URL.revokeObjectURL(item.preview);
    update(itemsRef.current.filter((current) => current.id !== id));
  };
  const clear = ({ preserveUploaded = false } = {}) => {
    for (const item of [...itemsRef.current]) {
      if (preserveUploaded && item.path) {
        controllers.current.get(item.id)?.abort();
        URL.revokeObjectURL(item.preview);
        continue;
      }
      void remove(item.id);
    }
    if (preserveUploaded)
      update(itemsRef.current.filter((item) => !item.path));
  };
  useEffect(
    () => {
      mounted.current = true;
      return () => {
      mounted.current = false;
      for (const c of controllers.current.values()) c.abort();
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.preview);
        if (item.uploadId || item.path)
          void fetch("/api/images", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.uploadId, path: item.path }),
            keepalive: true,
          }).catch(() => {});
      }
      };
    },
    [],
  );
  return {
    items,
    add,
    remove,
    clear,
    retry: run,
    paths: items.flatMap((i) => (i.path ? [i.path] : [])),
    blocked: items.some((i) => i.status !== "done"),
    isBlocked: () => itemsRef.current.some((i) => i.status !== "done"),
  };
}
export type ImageUploads = ReturnType<typeof useImageUploads>;
