"use client";

import { Button } from "@/components/ui/button";

export type QuoteViewMode = "3d" | "list";

export const QuoteListToggle: React.FC<{
  mode: QuoteViewMode;
  onChange: (mode: QuoteViewMode) => void;
}> = ({ mode, onChange }) => {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
      <Button
        size="sm"
        variant={mode === "3d" ? "default" : "ghost"}
        onClick={() => onChange("3d")}
      >
        3D 뷰
      </Button>
      <Button
        size="sm"
        variant={mode === "list" ? "default" : "ghost"}
        onClick={() => onChange("list")}
      >
        리스트
      </Button>
    </div>
  );
};
