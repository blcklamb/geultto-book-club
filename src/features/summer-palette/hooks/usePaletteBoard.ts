"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "../lib/paletteLogic";
import {
  clearBoardStorage,
  getBoardStorageKey,
  loadBoardFromStorage,
  normalizeBoard,
  saveBoardToStorage,
} from "../lib/storage";
import type { PaletteBoard, CellPhoto } from "../types";

const SERVER_BOARD_ENDPOINT = "/api/summer-palette/board";

type SyncState = "loading" | "local" | "saving" | "synced" | "error";

export function usePaletteBoard() {
  const { session } = useSession();
  const sessionUser = session.user;
  const canSyncToServer = Boolean(
    sessionUser && sessionUser.role !== "pending" && !sessionUser.isDeactivated,
  );
  const storageKey = useMemo(
    () => getBoardStorageKey(sessionUser?.id),
    [sessionUser?.id],
  );
  const [board, setBoard] = useState(() => createInitialBoard());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("loading");
  // 사용자가 직접 칸을 편집했을 때만 true가 되어, 단순 하이드레이션 후
  // 변경 없는 보드를 서버에 다시 저장(=updated_at 갱신으로 갤러리 순서가 바뀜)하지 않도록 한다.
  const isDirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const localBoard = loadBoardFromStorage(storageKey);

    isDirtyRef.current = false;
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
  }, [canSyncToServer, sessionUser?.id, storageKey]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      try {
        saveBoardToStorage(board, storageKey);
        setStorageError(null);
      } catch (err) {
        console.error(err);
        setStorageError(
          "브라우저 저장 공간이 부족해 진행 상태를 저장하지 못했습니다.",
        );
      }

      // 사용자가 편집하지 않은 채 페이지만 열어본 경우에는 서버에 다시 쓰지 않는다.
      if (!canSyncToServer || !isDirtyRef.current) {
        setSyncState(canSyncToServer ? "synced" : "local");
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
  }, [board, canSyncToServer, isLoaded, storageKey]);

  const updatePhoto = useCallback((cellIndex: number, photo: CellPhoto) => {
    isDirtyRef.current = true;
    setBoard((current) => withUpdatedCellPhoto(current, cellIndex, photo));
  }, []);

  const clearPhoto = useCallback((cellIndex: number) => {
    isDirtyRef.current = true;
    setBoard((current) => withClearedCellPhoto(current, cellIndex));
  }, []);

  const resetBoard = useCallback(() => {
    isDirtyRef.current = true;
    clearBoardStorage(storageKey);
    setBoard(createInitialBoard());
  }, [storageKey]);

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

async function saveBoardToServer(board: PaletteBoard) {
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
  localBoard: PaletteBoard | null,
  serverBoard: PaletteBoard | null,
) {
  if (!localBoard) {
    return serverBoard;
  }

  if (!serverBoard) {
    return localBoard;
  }

  // 최신성(updatedAt)을 우선으로 비교한다. 다른 기기에서 사진을 지워
  // 채워진 칸 수가 줄었더라도 더 최근에 갱신된 상태가 정답이므로,
  // 오래된 로컬 사본이 최신 서버 변경을 덮어쓰지 않게 한다.
  const localTime = getUpdatedAtTime(localBoard);
  const serverTime = getUpdatedAtTime(serverBoard);

  if (localTime !== serverTime) {
    return localTime > serverTime ? localBoard : serverBoard;
  }

  // 타임스탬프가 같거나 비교 불가하면 더 많이 채운 보드를 보존한다.
  return getFilledCount(localBoard) >= getFilledCount(serverBoard)
    ? localBoard
    : serverBoard;
}

function getUpdatedAtTime(board: PaletteBoard) {
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
