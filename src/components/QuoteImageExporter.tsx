"use client";

import { useMemo, useState } from "react";
import { Download, ImageDown, Loader2 } from "lucide-react";
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

// 내보내는 PNG 에 그려지는 색이라 CSS 토큰을 쓸 수 없어 값을 직접 둔다.
// 배경은 단색, 포인트는 서비스 브랜드 컬러(러스트 브라운) 계열 한 가지만 쓴다.
type QuoteTheme = {
  id: string;
  name: string;
  description: string;
  background: string;
  text: string;
  muted: string;
  accent: string;
};

const QUOTE_THEMES: QuoteTheme[] = [
  {
    id: "paper",
    name: "종이",
    description: "밝은 미색 배경",
    background: "#f7f4ee",
    text: "#1f1c18",
    muted: "#6b645b",
    accent: "#904529",
  },
  {
    id: "sand",
    name: "모래",
    description: "차분한 베이지 배경",
    background: "#ebe3d6",
    text: "#2a241d",
    muted: "#6e6254",
    accent: "#79371e",
  },
  {
    id: "ink",
    name: "먹색",
    description: "어두운 배경에 밝은 글자",
    background: "#24211d",
    text: "#f2eee6",
    muted: "#b3aa9d",
    accent: "#d9906f",
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

      ctx.fillStyle = selectedTheme.background;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Typography setup
      ctx.textBaseline = "top";
      const metaText = `${bookTitle || "책 제목 미상"} • p.${
        pageNumber || "-"
      }`;
      const metaFont =
        "600 28px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
      const quoteFont =
        "600 46px 'Pretendard', 'Inter', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";
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
          variant="ghost"
          size="sm"
          className="-ml-3 text-foreground"
        >
          <ImageDown aria-hidden="true" />
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
                "flex flex-col gap-2 rounded-md border p-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
                selectedTheme.id === theme.id
                  ? "border-foreground"
                  : "border-border"
              )}
              aria-pressed={selectedTheme.id === theme.id}
            >
              <div
                className="flex h-16 w-full items-center rounded-sm border border-border px-3"
                style={{ backgroundColor: theme.background }}
                aria-hidden="true"
              >
                <span
                  className="h-8 w-1 rounded-sm"
                  style={{ backgroundColor: theme.accent }}
                />
                <span
                  className="ml-2 h-2 w-12 rounded-sm"
                  style={{ backgroundColor: theme.text }}
                />
              </div>
              <div className="px-2 pb-1">
                <p className="text-sm font-semibold text-foreground">
                  {theme.name}
                </p>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          긴 문장은 자동으로 줄바꿈되고, 12줄을 넘으면 말줄임표로
          끝납니다.
        </p>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button onClick={handleDownload} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                이미지 만드는 중
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                PNG로 저장
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
