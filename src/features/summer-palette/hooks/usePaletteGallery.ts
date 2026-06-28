"use client";

import { useEffect, useState } from "react";
import { normalizeBoard } from "../lib/storage";
import type { PaletteBoard, PaletteGalleryItem } from "../types";

const PALETTE_GALLERY_ENDPOINT = "/api/summer-palette/boards";

export function usePaletteGallery(enabled: boolean) {
  const [items, setItems] = useState<PaletteGalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    loadPaletteGallery(controller.signal)
      .then((nextItems) => {
        setItems(nextItems);
        setError(null);
      })
      .catch((err) => {
        if (isAbortError(err)) {
          return;
        }

        console.error(err);
        setItems([]);
        setError(
          err instanceof Error
            ? err.message
            : "다른 사람들의 팔레트를 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [enabled]);

  return { items, isLoading, error };
}

export async function loadPaletteGallery(signal?: AbortSignal) {
  const response = await fetch(PALETTE_GALLERY_ENDPOINT, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (response.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }

  if (response.status === 403) {
    throw new Error("승인된 회원만 다른 사람들의 팔레트를 볼 수 있습니다.");
  }

  if (!response.ok) {
    throw new Error("다른 사람들의 팔레트를 불러오지 못했습니다.");
  }

  const payload = (await response.json()) as unknown;
  return normalizeGalleryPayload(payload);
}

export function normalizeGalleryPayload(value: unknown): PaletteGalleryItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return [];
  }

  return value.items.map(normalizeGalleryItem).filter(isGalleryItem);
}

function normalizeGalleryItem(value: unknown): PaletteGalleryItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const board = normalizeBoard(value.board);
  if (
    !board ||
    typeof value.userId !== "string" ||
    typeof value.nickname !== "string" ||
    typeof value.filledCount !== "number" ||
    typeof value.isFullClear !== "boolean"
  ) {
    return null;
  }

  return {
    userId: value.userId,
    nickname: value.nickname,
    profileImageUrl:
      typeof value.profileImageUrl === "string" ? value.profileImageUrl : null,
    profileDecoration:
      typeof value.profileDecoration === "string"
        ? value.profileDecoration
        : "none",
    board: sanitizeIncompleteBoard(board, value.isFullClear),
    filledCount: value.filledCount,
    isFullClear: value.isFullClear,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

function sanitizeIncompleteBoard(
  board: PaletteBoard,
  isFullClear: boolean,
): PaletteBoard {
  if (isFullClear) {
    return board;
  }

  return {
    ...board,
    cells: board.cells.map(({ photo: _photo, ...cell }) => cell),
  };
}

function isGalleryItem(
  item: PaletteGalleryItem | null,
): item is PaletteGalleryItem {
  return item !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
