"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateImageFile } from "@/lib/content-images";

export type ImageUpload = {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "error" | "done";
  path?: string;
  error?: string;
};
type UploadCallbacks = {
  onUploaded?: (image: { path: string; url: string }, id: string) => void;
  onAdded?: (id: string) => void;
  onRemoved?: (id: string) => void;
};
export function useImageUploads(callbacks: UploadCallbacks = {}) {
  const [items, setItems] = useState<ImageUpload[]>([]);
  const itemsRef = useRef(items);
  const callback = useRef(callbacks);
  callback.current = callbacks;
  const controllers = useRef(new Map<string, AbortController>());
  const update = useCallback((next: ImageUpload[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);
  const run = async (item: ImageUpload) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    update(
      itemsRef.current.map((i) =>
        i.id === item.id ? { ...i, status: "uploading", error: undefined } : i,
      ),
    );
    try {
      validateImageFile(item.file);
      const form = new FormData();
      form.set("file", item.file);
      const direct = item.file.size > 4 * 1024 * 1024;
      const body = direct
        ? JSON.stringify({
            type: item.file.type,
            size: item.file.size,
            signature: Array.from(
              new Uint8Array(await item.file.slice(0, 12).arrayBuffer()),
            ),
          })
        : form;
      const res = await fetch("/api/images", {
        method: "POST",
        body,
        ...(direct ? { headers: { "Content-Type": "application/json" } } : {}),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "이미지 업로드 실패");
      if (direct) {
        const uploadResponse = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type, "x-upsert": "false" },
          body: item.file,
          signal: controller.signal,
        });
        if (!uploadResponse.ok)
          throw new Error("이미지 업로드 실패. 다시 시도해주세요.");
      }
      if (
        controller.signal.aborted ||
        !itemsRef.current.some((i) => i.id === item.id)
      )
        return;
      callback.current.onUploaded?.(data, item.id);
      update(
        itemsRef.current.map((i) =>
          i.id === item.id ? { ...i, status: "done", path: data.path } : i,
        ),
      );
    } catch (error) {
      if (!controller.signal.aborted)
        update(
          itemsRef.current.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
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
    const next = files.map(
      (file): ImageUpload => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "uploading",
      }),
    );
    for (const item of next) callback.current.onAdded?.(item.id);
    update([...itemsRef.current, ...next]);
    // Preserve insertion order, including when several files are pasted at once.
    void (async () => {
      for (const item of next)
        if (itemsRef.current.some((i) => i.id === item.id)) await run(item);
    })();
  };
  const remove = (id: string) => {
    controllers.current.get(id)?.abort();
    callback.current.onRemoved?.(id);
    const item = itemsRef.current.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    update(itemsRef.current.filter((i) => i.id !== id));
  };
  const clear = () => {
    for (const item of itemsRef.current) {
      controllers.current.get(item.id)?.abort();
      callback.current.onRemoved?.(item.id);
      URL.revokeObjectURL(item.preview);
    }
    update([]);
  };
  useEffect(
    () => () => {
      for (const c of controllers.current.values()) c.abort();
      for (const item of itemsRef.current) URL.revokeObjectURL(item.preview);
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
