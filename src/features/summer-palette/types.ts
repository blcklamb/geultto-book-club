export type CellType = "theme";

export interface CellPhoto {
  dataUrl: string;
  fileName?: string;
  width: number;
  height: number;
}

export interface PaletteCell {
  id: string;
  index: number;
  type: CellType;
  title: string;
  photo?: CellPhoto;
  completedAt?: string;
}

export interface PaletteBoard {
  id: string;
  title: string;
  size: 3;
  cells: PaletteCell[];
  createdAt: string;
  updatedAt: string;
}

export interface PaletteGalleryItem {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  profileDecoration: string | null;
  board: PaletteBoard;
  filledCount: number;
  isFullClear: boolean;
  updatedAt: string | null;
}
