"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { QuoteListToggle, QuoteViewMode } from "@/components/QuoteListToggle";
import { QuoteCard } from "@/components/QuoteCard";
import DetailHeader from "@/components/DetailHeader";
import { QuoteCreateDialog } from "@/components/QuoteCreateDialog";
import { CohortFilter } from "@/components/CohortFilter";

const QuotesFloatingScene3D = dynamic(
  () =>
    import("@/components/QuotesFloatingScene3D").then(
      (mod) => mod.QuotesFloatingScene3D,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] w-full rounded-xl border border-slate-200 bg-slate-900/95" />
    ),
  },
);

export type QuotesClientProps = {
  quotes: Array<{
    id: string;
    text: string;
    page: string;
    scheduleTitle: string;
    author: string;
    authorImageUrl?: string | null;
    authorDecoration?: string | null;
  }>;
  schedules: Array<{
    id: string;
    title: string;
  }>;
  canCreate: boolean;
  cohorts: number[];
  selectedCohort: number | null;
};

export const QuotesClient: React.FC<QuotesClientProps> = ({
  quotes,
  schedules,
  canCreate,
  cohorts,
  selectedCohort,
}) => {
  const [mode, setMode] = useState<QuoteViewMode>("3d");

  return (
    <>
      <DetailHeader title="인상 깊은 구절" />
      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-4">
            {cohorts.length > 0 ? (
              <CohortFilter cohorts={cohorts} selected={selectedCohort} />
            ) : null}
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
