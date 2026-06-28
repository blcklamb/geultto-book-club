import type { CellPhoto } from "../types";

const DEFAULT_MAX_SIZE = 1024;
const DEFAULT_QUALITY = 0.8;

export async function resizeImageFile(
  file: File,
  maxSize = DEFAULT_MAX_SIZE,
  quality = DEFAULT_QUALITY,
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

  return {
    dataUrl: canvas.toDataURL("image/jpeg", quality),
    fileName: file.name,
    width,
    height,
  };
}

export function formatPaletteTimestamp(date = new Date()) {
  const [month, day, hours, minutes] = [
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ].map((part) => String(part).padStart(2, "0"));

  return `${month}.${day} ${hours}:${minutes}`;
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
