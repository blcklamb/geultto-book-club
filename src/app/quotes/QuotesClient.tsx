"use client";

import { useState } from "react";
import { QuoteListToggle, QuoteViewMode } from "@/components/QuoteListToggle";
import { Button } from "@/components/ui/button";
import { QuotesFloatingScene3D } from "@/components/QuotesFloatingScene3D";
import { QuoteCard } from "@/components/QuoteCard";

export type QuotesClientProps = {
  quotes: Array<{
    id: string;
    text: string;
    page: string;
    scheduleTitle: string;
    author: string;
  }>;
  canCreate: boolean;
};

export const QuotesClient: React.FC<QuotesClientProps> = ({
  quotes,
  canCreate,
}) => {
  const [mode, setMode] = useState<QuoteViewMode>("3d");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            인상 깊은 구절
          </h1>
          <p className="text-sm text-slate-500">
            좋았던 문장을 나누고 공감해요.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <QuoteListToggle mode={mode} onChange={setMode} />
          {canCreate ? <Button variant="outline">구절 추가</Button> : null}
        </div>
      </div>
      {mode === "3d" ? (
        <QuotesFloatingScene3D quotes={quotes} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
        </div>
      )}
    </div>
  );
};
