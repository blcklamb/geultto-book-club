import type { CellPhoto } from "../types";

const DEFAULT_MAX_SIZE = 1024;
const DEFAULT_QUALITY = 0.8;

export async function resizeImageFile(
  file: File,
  maxSize = DEFAULT_MAX_SIZE,
  quality = DEFAULT_QUALITY,
  now = new Date(),
): Promise<CellPhoto> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("이미지 리사이즈를 위한 캔버스를 만들 수 없습니다.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  drawPhotoTimestamp(ctx, width, height, formatPhotoTimestamp(now));

  return {
    dataUrl: canvas.toDataURL("image/jpeg", quality),
    fileName: file.name,
    width,
    height,
  };
}

export function formatPhotoTimestamp(date = new Date()) {
  return [
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(".");
}

function drawPhotoTimestamp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: string,
) {
  ctx.save();

  let fontSize = Math.max(
    12,
    Math.min(44, Math.round(Math.min(width, height) * 0.07)),
  );
  let box = measureTimestampBox(ctx, timestamp, fontSize);

  while (fontSize > 10 && box.width > width - fontSize) {
    fontSize -= 1;
    box = measureTimestampBox(ctx, timestamp, fontSize);
  }

  const margin = Math.max(6, Math.round(fontSize * 0.7));
  const x = Math.max(4, width - box.width - margin);
  const y = Math.max(4, height - box.height - margin);

  ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
  ctx.shadowBlur = Math.round(fontSize * 0.45);
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  drawRoundedRect(ctx, x, y, box.width, box.height, Math.round(box.height / 2));
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(timestamp, x + box.paddingX, y + box.height / 2);

  ctx.restore();
}

function measureTimestampBox(
  ctx: CanvasRenderingContext2D,
  timestamp: string,
  fontSize: number,
) {
  ctx.font =
    `700 ${fontSize}px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif`;
  const paddingX = Math.round(fontSize * 0.65);
  const paddingY = Math.round(fontSize * 0.38);

  return {
    width: Math.ceil(ctx.measureText(timestamp).width) + paddingX * 2,
    height: fontSize + paddingY * 2,
    paddingX,
  };
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지 파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    image.src = src;
  });
}
