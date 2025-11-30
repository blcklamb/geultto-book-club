"use client";

import { useState } from "react";
import { QuoteListToggle, QuoteViewMode } from "@/components/QuoteListToggle";
import { QuotesFloatingScene3D } from "@/components/QuotesFloatingScene3D";
import { QuoteCard } from "@/components/QuoteCard";
import DetailHeader from "@/components/DetailHeader";
import { QuoteCreateDialog } from "@/components/QuoteCreateDialog";

export type QuotesClientProps = {
  quotes: Array<{
    id: string;
    text: string;
    page: string;
    scheduleTitle: string;
    author: string;
  }>;
  schedules: Array<{
    id: string;
    title: string;
  }>;
  canCreate: boolean;
};

export const QuotesClient: React.FC<QuotesClientProps> = ({
  quotes,
  schedules,
  canCreate,
}) => {
  const [mode, setMode] = useState<QuoteViewMode>("3d");

  return (
    <>
      <DetailHeader title="인상 깊은 구절" />
      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <QuoteListToggle mode={mode} onChange={setMode} />
            {canCreate ? (
              <QuoteCreateDialog schedules={schedules} redirectTo="/quotes" />
            ) : null}
          </div>
        </div>
        {mode === "3d" ? (
          <QuotesFloatingScene3D quotes={quotes} />
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 sm:gap-8">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="break-inside-avoid-column -webkit-column-break-inside-avoid mb-4"
              >
                <QuoteCard quote={quote} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
