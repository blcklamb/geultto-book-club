export type CellType = "theme";

export interface CellPhoto {
  dataUrl: string;
  fileName?: string;
  width: number;
  height: number;
}

export interface BingoCell {
  id: string;
  index: number;
  type: CellType;
  title: string;
  photo?: CellPhoto;
  completedAt?: string;
}

export interface BingoBoard {
  id: string;
  title: string;
  size: 3;
  cells: BingoCell[];
  createdAt: string;
  updatedAt: string;
}
