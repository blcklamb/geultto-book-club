"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateImageFile } from "@/lib/content-images";

export type ImageUpload = {
  id: string;
  file: File;
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
      optionsRef.current.onUploaded?.(data, item.id);
      update(
        itemsRef.current.map((i) =>
          i.id === item.id
            ? { ...i, status: "done", path: data.path, url: data.url }
            : i,
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
    if (item.path) {
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
          body: JSON.stringify({ path: item.path }),
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
    () => () => {
      for (const c of controllers.current.values()) c.abort();
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.preview);
        if (item.path)
          void fetch("/api/images", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: item.path }),
            keepalive: true,
          });
      }
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
