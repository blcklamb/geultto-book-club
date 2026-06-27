import { useState } from "react";
import { SUMMER_BINGO_CELL_ACCENTS } from "../data/themes";
import { isCellFilled } from "../lib/bingoLogic";
import { formatPhotoTimestamp } from "./useImageResize";
import type { BingoBoard, BingoCell } from "../types";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1500;
const BOARD_LEFT = 84;
const BOARD_TOP = 260;
const CELL_SIZE = 344;
const CELL_GAP = 0;
const CELL_RADIUS = 0;
const BOARD_SIZE = CELL_SIZE * 3 + CELL_GAP * 2;
const EXPORT_FILE_NAME = "summer-book-bingo.png";
const IMAGE_LOAD_TIMEOUT_MS = 10_000;

export function useImageExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportBoard(board: BingoBoard) {
    setIsExporting(true);
    setError(null);

    try {
      await document.fonts?.ready;
      const blob = await renderBoardToBlob(board);
      downloadBlob(blob, EXPORT_FILE_NAME);
    } catch (err) {
      console.error(err);
      setError("빙고 판 이미지를 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsExporting(false);
    }
  }

  return { exportBoard, isExporting, error };
}

export async function renderBoardToPng(board: BingoBoard) {
  const canvas = await renderBoardToCanvas(board);
  return canvas.toDataURL("image/png");
}

export async function renderBoardToBlob(board: BingoBoard) {
  const canvas = await renderBoardToCanvas(board);
  const blob = await canvasToBlob(canvas);

  if (!blob) {
    throw new Error("빙고 판 이미지를 PNG 파일로 변환하지 못했습니다.");
  }

  return blob;
}

async function renderBoardToCanvas(board: BingoBoard) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("캔버스를 초기화할 수 없습니다.");
  }

  await drawBoard(ctx, board);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

export function downloadBlob(blob: Blob, fileName = EXPORT_FILE_NAME) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 30_000);
}

async function drawBoard(ctx: CanvasRenderingContext2D, board: BingoBoard) {
  const pageGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  pageGradient.addColorStop(0, "#dff7ff");
  pageGradient.addColorStop(0.48, "#f3fbff");
  pageGradient.addColorStop(1, "#e7fff0");

  ctx.fillStyle = pageGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawRoundedRect(ctx, 52, 48, CANVAS_WIDTH - 104, CANVAS_HEIGHT - 96, 42);
  const cardGradient = ctx.createLinearGradient(52, 48, 52, CANVAS_HEIGHT - 48);
  cardGradient.addColorStop(0, "#ffffff");
  cardGradient.addColorStop(0.5, "#ebfbff");
  cardGradient.addColorStop(1, "#f1fff5");
  ctx.fillStyle = cardGradient;
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font =
    "800 76px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(board.title, 92, 88);

  for (const cell of board.cells) {
    const col = cell.index % 3;
    const row = Math.floor(cell.index / 3);
    const x = BOARD_LEFT + col * (CELL_SIZE + CELL_GAP);
    const y = BOARD_TOP + row * (CELL_SIZE + CELL_GAP);
    await drawCell(ctx, cell, x, y);
  }

  ctx.fillStyle = "#334155";
  ctx.font =
    "700 32px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("글또 북클럽", 92, 1348);

  ctx.fillStyle = "#64748b";
  ctx.font =
    "500 26px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("여름 독서 기록", 92, 1394);
}

async function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: BingoCell,
  x: number,
  y: number,
) {
  const accent = SUMMER_BINGO_CELL_ACCENTS[cell.index] ?? "#f97316";
  const image = cell.photo?.dataUrl ? await loadImage(cell.photo.dataUrl) : null;

  ctx.save();
  drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
  ctx.clip();

  if (image) {
    drawImageCover(ctx, image, x, y, CELL_SIZE, CELL_SIZE);
    const overlay = ctx.createLinearGradient(x, y + CELL_SIZE * 0.45, x, y + CELL_SIZE);
    overlay.addColorStop(0, "rgba(15, 23, 42, 0)");
    overlay.addColorStop(1, "rgba(15, 23, 42, 0.78)");
    ctx.fillStyle = overlay;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = `${accent}22`;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  }

  ctx.fillStyle = isCellFilled(cell) ? "#ffffff" : "#0f172a";
  ctx.font =
    "800 30px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
  ctx.textBaseline = "top";
  const titleLines = buildLines(ctx, cell.title, CELL_SIZE - 56, 4);
  const titleY = isCellFilled(cell)
    ? y + CELL_SIZE - 44 - titleLines.length * 37
    : y + 96;
  titleLines.forEach((line, index) => {
    ctx.fillText(line, x + 28, titleY + index * 37);
  });

  ctx.fillStyle = accent;
  ctx.fillRect(x + 28, y + 28, 58, 8);

  if (image) {
    drawPhotoTimestampPill(ctx, cell, x, y);
  }

  if (isCellFilled(cell)) {
    ctx.beginPath();
    ctx.arc(x + CELL_SIZE - 52, y + 52, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#10b981";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE - 66, y + 52);
    ctx.lineTo(x + CELL_SIZE - 56, y + 64);
    ctx.lineTo(x + CELL_SIZE - 38, y + 42);
    ctx.stroke();
  }

  ctx.restore();

  drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
  ctx.strokeStyle = isCellFilled(cell) ? "#fdba74" : "#fed7aa";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;
  const drawWidth = imageRatio > boxRatio ? height * imageRatio : width;
  const drawHeight = imageRatio > boxRatio ? height : width / imageRatio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawPhotoTimestampPill(
  ctx: CanvasRenderingContext2D,
  cell: BingoCell,
  x: number,
  y: number,
) {
  const timestamp = formatCellTimestamp(cell);
  if (!timestamp) {
    return;
  }

  const fontSize = 22;
  const paddingX = 14;
  const height = 34;
  const timestampX = x + 28;
  const timestampY = y + 48;

  ctx.save();
  ctx.font =
    `800 ${fontSize}px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif`;
  ctx.textBaseline = "middle";

  const width = Math.ceil(ctx.measureText(timestamp).width) + paddingX * 2;
  ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
  drawRoundedRect(ctx, timestampX, timestampY, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(timestamp, timestampX + paddingX, timestampY + height / 2);
  ctx.restore();
}

function formatCellTimestamp(cell: BingoCell) {
  if (!cell.completedAt) {
    return null;
  }

  const date = new Date(cell.completedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatPhotoTimestamp(date);
}

function buildLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}...`];
  }

  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      reject(new Error("이미지를 불러오는 시간이 초과되었습니다."));
    }, IMAGE_LOAD_TIMEOUT_MS);

    image.onload = () => {
      window.clearTimeout(timeoutId);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    image.src = src;
  });
}
