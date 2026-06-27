"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import {
  createInitialBoard,
  getCompletedLineKeys,
  getCompletedLines,
  getFilledCount,
  getHighlightedCellIndexes,
  isFullClear,
  withClearedCellPhoto,
  withUpdatedCellPhoto,
} from "../lib/bingoLogic";
import {
  clearBoardStorage,
  loadBoardFromStorage,
  normalizeBoard,
  saveBoardToStorage,
} from "../lib/storage";
import type { BingoBoard, CellPhoto } from "../types";

const SERVER_BOARD_ENDPOINT = "/api/summer-bingo/board";

type SyncState = "loading" | "local" | "saving" | "synced" | "error";

export function useBingoBoard() {
  const { session } = useSession();
  const sessionUser = session.user;
  const canSyncToServer = Boolean(
    sessionUser && sessionUser.role !== "pending" && !sessionUser.isDeactivated,
  );
  const [board, setBoard] = useState(() => createInitialBoard());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("loading");

  useEffect(() => {
    let cancelled = false;
    const localBoard = loadBoardFromStorage();

    setIsLoaded(false);
    setServerError(null);
    setStorageError(null);
    setBoard(localBoard ?? createInitialBoard());

    if (!canSyncToServer) {
      setSyncState("local");
      setIsLoaded(true);
      return;
    }

    setSyncState("loading");

    async function loadServerBoard() {
      try {
        const response = await fetch(SERVER_BOARD_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setSyncState("local");
            setIsLoaded(true);
          }
          return;
        }

        if (!response.ok) {
          throw new Error("서버 팔레트를 불러오지 못했습니다.");
        }

        const payload = (await response.json()) as { board?: unknown };
        const serverBoard = normalizeBoard(payload.board);
        const nextBoard = selectPreferredBoard(localBoard, serverBoard);

        if (!cancelled) {
          setBoard(nextBoard ?? createInitialBoard());
          setSyncState("synced");
          setIsLoaded(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setServerError(
            "서버에 저장된 팔레트를 불러오지 못했습니다. 이 브라우저의 저장본을 사용합니다.",
          );
          setSyncState("error");
          setIsLoaded(true);
        }
      }
    }

    void loadServerBoard();

    return () => {
      cancelled = true;
    };
  }, [canSyncToServer, sessionUser?.id]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      try {
        saveBoardToStorage(board);
        setStorageError(null);
      } catch (err) {
        console.error(err);
        setStorageError(
          "브라우저 저장 공간이 부족해 진행 상태를 저장하지 못했습니다.",
        );
      }

      if (!canSyncToServer) {
        setSyncState("local");
        return;
      }

      setSyncState("saving");
      saveBoardToServer(board)
        .then(() => {
          if (!cancelled) {
            setServerError(null);
            setSyncState("synced");
          }
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) {
            setServerError(
              "팔레트를 서버에 저장하지 못했습니다. 이 브라우저에는 임시 저장되었습니다.",
            );
            setSyncState("error");
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [board, canSyncToServer, isLoaded]);

  const updatePhoto = useCallback((cellIndex: number, photo: CellPhoto) => {
    setBoard((current) => withUpdatedCellPhoto(current, cellIndex, photo));
  }, []);

  const clearPhoto = useCallback((cellIndex: number) => {
    setBoard((current) => withClearedCellPhoto(current, cellIndex));
  }, []);

  const resetBoard = useCallback(() => {
    clearBoardStorage();
    setBoard(createInitialBoard());
  }, []);

  const stats = useMemo(() => {
    const completedLines = getCompletedLines(board);

    return {
      filledCount: getFilledCount(board),
      completedLines,
      completedLineKeys: getCompletedLineKeys(board),
      highlightedCellIndexes: getHighlightedCellIndexes(board),
      isFullClear: isFullClear(board),
    };
  }, [board]);

  return {
    board,
    isLoaded,
    storageError,
    serverError,
    syncState,
    syncLabel: getSyncLabel(syncState, canSyncToServer),
    stats,
    updatePhoto,
    clearPhoto,
    resetBoard,
  };
}

async function saveBoardToServer(board: BingoBoard) {
  const response = await fetch(SERVER_BOARD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board }),
  });

  if (!response.ok) {
    throw new Error("서버 팔레트 저장 실패");
  }
}

function selectPreferredBoard(
  localBoard: BingoBoard | null,
  serverBoard: BingoBoard | null,
) {
  if (!localBoard) {
    return serverBoard;
  }

  if (!serverBoard) {
    return localBoard;
  }

  const localFilledCount = getFilledCount(localBoard);
  const serverFilledCount = getFilledCount(serverBoard);

  if (localFilledCount !== serverFilledCount) {
    return localFilledCount > serverFilledCount ? localBoard : serverBoard;
  }

  return getUpdatedAtTime(localBoard) >= getUpdatedAtTime(serverBoard)
    ? localBoard
    : serverBoard;
}

function getUpdatedAtTime(board: BingoBoard) {
  const time = Date.parse(board.updatedAt);
  return Number.isFinite(time) ? time : 0;
}

function getSyncLabel(syncState: SyncState, canSyncToServer: boolean) {
  if (!canSyncToServer) {
    return "로그인 시 서버 저장";
  }

  switch (syncState) {
    case "loading":
      return "서버 불러오는 중";
    case "saving":
      return "서버 저장 중";
    case "synced":
      return "서버 저장됨";
    case "error":
      return "서버 저장 실패";
    case "local":
      return "브라우저 저장됨";
  }
}
