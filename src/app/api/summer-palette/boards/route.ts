import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import type { Database } from "@supabase/types";
import { getSessionUser } from "@/lib/auth";
import { normalizeBoard } from "@/features/summer-palette/lib/storage";
import type {
  PaletteBoard,
  PaletteGalleryItem,
} from "@/features/summer-palette/types";

type PaletteGalleryRow =
  Database["public"]["Functions"]["list_summer_palette_boards"]["Returns"][number];

export async function GET() {
  const authError = await getPaletteGalleryAuthError();
  if (authError) {
    return authError;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_summer_palette_boards");

  if (error) {
    console.error("Failed to load summer palette gallery", { error });
    return NextResponse.json(
      { message: "다른 사람들의 팔레트를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    items: (data ?? []).map(toGalleryItem).filter(isGalleryItem),
  });
}

async function getPaletteGalleryAuthError() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  if (sessionUser.isDeactivated || sessionUser.role === "pending") {
    return NextResponse.json(
      { message: "승인된 회원만 다른 사람들의 팔레트를 볼 수 있습니다." },
      { status: 403 },
    );
  }

  return null;
}

function toGalleryItem(row: PaletteGalleryRow): PaletteGalleryItem | null {
  const board = normalizeBoard(row.board);
  if (!board) {
    return null;
  }

  return {
    userId: row.user_id,
    nickname: row.nickname,
    profileImageUrl: row.profile_image_url,
    profileDecoration: row.profile_decoration ?? "none",
    board: sanitizeIncompleteBoard(board, row.is_full_clear),
    filledCount: row.filled_count,
    isFullClear: row.is_full_clear,
    updatedAt: row.updated_at,
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
