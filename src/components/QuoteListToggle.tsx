"use client";

import { Button } from "@/components/ui/button";

export type QuoteViewMode = "3d" | "list";

export const QuoteListToggle: React.FC<{
  mode: QuoteViewMode;
  onChange: (mode: QuoteViewMode) => void;
}> = ({ mode, onChange }) => {
  return (
    <div
      role="group"
      aria-label="보기 방식"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1"
    >
      <Button
        size="sm"
        variant={mode === "3d" ? "default" : "ghost"}
        aria-pressed={mode === "3d"}
        onClick={() => onChange("3d")}
      >
        3D 뷰
      </Button>
      <Button
        size="sm"
        variant={mode === "list" ? "default" : "ghost"}
        aria-pressed={mode === "list"}
        onClick={() => onChange("list")}
      >
        리스트
      </Button>
    </div>
  );
};
