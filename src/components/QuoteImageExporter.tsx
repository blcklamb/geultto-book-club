"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type QuoteImageExporterProps = {
  quoteText: string;
  bookTitle?: string | null;
  pageNumber?: string | number | null;
  author?: string | null;
};

type QuoteTheme = {
  id: string;
  name: string;
  description: string;
  gradient: string[];
  text: string;
  muted: string;
  accent: string;
  highlight: string;
};

const QUOTE_THEMES: QuoteTheme[] = [
  {
    id: "sunrise",
    name: "Sunrise",
    description: "따뜻한 노란빛 그라데이션",
    gradient: ["#fff7ed", "#fde68a", "#f59e0b"],
    text: "#111827",
    muted: "#4b5563",
    accent: "#f97316",
    highlight: "rgba(249, 115, 22, 0.12)",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "짙은 남색과 청록 포인트",
    gradient: ["#0f172a", "#111827", "#0ea5e9"],
    text: "#e2e8f0",
    muted: "#cbd5e1",
    accent: "#38bdf8",
    highlight: "rgba(56, 189, 248, 0.16)",
  },
  {
    id: "forest",
    name: "Forest",
    description: "잔잔한 초록 톤",
    gradient: ["#ecfdf3", "#a7f3d0", "#10b981"],
    text: "#064e3b",
    muted: "#065f46",
    accent: "#0f766e",
    highlight: "rgba(16, 185, 129, 0.12)",
  },
];

export function QuoteImageExporter({
  quoteText,
  bookTitle,
  pageNumber,
  author,
}: QuoteImageExporterProps) {
  const [selectedTheme, setSelectedTheme] = useState<QuoteTheme>(
    QUOTE_THEMES[0]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const safeFileName = useMemo(() => {
    const base = (bookTitle || "quote")
      .replace(/[^a-zA-Z0-9가-힣-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    return base || "quote";
  }, [bookTitle]);

  async function handleDownload() {
    setIsSaving(true);
    setError(null);
    try {
      const canvasSize = 1080;
      const padding = 96;
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("캔버스를 초기화할 수 없습니다.");
      }

      // Background gradient
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvasSize,
        canvasSize
      );
      selectedTheme.gradient.forEach((color, index) => {
        const stop =
          selectedTheme.gradient.length === 1
            ? 1
            : index / (selectedTheme.gradient.length - 1);
        gradient.addColorStop(stop, color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Soft highlight
      ctx.fillStyle = selectedTheme.highlight;
      ctx.beginPath();
      ctx.arc(canvasSize - 180, canvasSize - 180, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(180, 220, 140, 0, Math.PI * 2);
      ctx.fill();

      // Typography setup
      ctx.textBaseline = "top";
      const metaText = `${bookTitle || "책 제목 미상"} • p.${
        pageNumber || "-"
      }`;
      const metaFont =
        "600 28px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
      const quoteFont =
        "700 46px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
      const authorFont =
        "600 32px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
      const lineHeight = 64;
      const metaHeight = 32;
      const authorHeight = 36;
      const metaSpacing = 24;
      const authorSpacing = 12;

      // Pre-compute quote layout for centering
      ctx.font = quoteFont;
      const quoteLines = buildLines(
        ctx,
        `“${quoteText}”`,
        canvasSize - padding * 2 - 18
      );
      const quoteHeight = quoteLines.length * lineHeight;
      const contentHeight =
        metaHeight + metaSpacing + quoteHeight + authorSpacing + authorHeight;

      // Center vertically but keep within padding
      let metaY = (canvasSize - contentHeight) / 2;
      metaY = Math.max(padding, metaY);
      const maxStart =
        canvasSize - padding - contentHeight > padding
          ? canvasSize - padding - contentHeight
          : padding;
      metaY = Math.min(metaY, maxStart);

      // Meta line
      ctx.fillStyle = selectedTheme.muted;
      ctx.font = metaFont;
      ctx.fillText(metaText, padding, metaY);

      // Quote body
      ctx.fillStyle = selectedTheme.text;
      ctx.font = quoteFont;
      const quoteBlockStartY = metaY + metaHeight + metaSpacing;
      let currentY = quoteBlockStartY;
      quoteLines.forEach((line) => {
        ctx.fillText(line, padding + 18, currentY);
        currentY += lineHeight;
      });

      // Accent bar
      ctx.fillStyle = selectedTheme.accent;
      ctx.fillRect(
        padding,
        quoteBlockStartY - 10,
        6,
        currentY - quoteBlockStartY + 20
      );

      // Author line
      ctx.fillStyle = selectedTheme.muted;
      ctx.font = authorFont;
      ctx.fillText(`- ${author || "익명"}`, padding + 18, currentY + authorSpacing);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${safeFileName}-quote.png`;
      link.click();
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      setError("이미지 저장 중 문제가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="px-0 text-indigo-700 hover:text-indigo-800"
        >
          <Palette className="mr-1 h-4 w-4" />
          이미지로 저장
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>구절을 이미지로 저장</DialogTitle>
          <DialogDescription>
            테마를 선택해 정사각형 PNG로 저장할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-3">
          {QUOTE_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSelectedTheme(theme)}
              className={cn(
                "flex flex-col rounded-md border p-[1px] text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400",
                selectedTheme.id === theme.id
                  ? "border-slate-900 shadow"
                  : "border-transparent bg-slate-50"
              )}
              aria-pressed={selectedTheme.id === theme.id}
            >
              <div
                className="h-16 w-full rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${theme.gradient.join(
                    ", "
                  )})`,
                }}
              />
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">
                  {theme.name}
                </p>
                <p className="text-xs text-slate-600">{theme.description}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-600">
          긴 문장은 자동으로 줄바꿈되고, 배경 테마는 세 가지 중 하나를 고를 수
          있습니다.
        </p>

        {error ? (
          <p className="text-xs text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button onClick={handleDownload} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                이미지 저장하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const paragraphs = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const lines: string[] = [];

  paragraphs.forEach((paragraph, idx) => {
    const words = paragraph.split(/\s+/);
    let current = "";
    words.forEach((word) => {
      const testLine = current ? `${current} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        current = testLine;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (idx < paragraphs.length - 1) {
      lines.push("");
    }
  });

  // Avoid overflow for extremely long quotes
  const maxLines = 12;
  if (lines.length > maxLines) {
    return [...lines.slice(0, maxLines - 1), "…"];
  }

  return lines;
}
