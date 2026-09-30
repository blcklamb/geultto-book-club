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
      <div
        className="h-[340px] w-full animate-pulse rounded-lg border border-border bg-muted"
        role="status"
        aria-label="구절 3D 뷰를 불러오는 중"
      />
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
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
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
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            이 기수에 등록된 구절이 아직 없어요. 다른 기수를 선택하거나 인상 깊은
            구절을 등록해 보세요.
          </p>
        ) : mode === "3d" ? (
          <QuotesFloatingScene3D quotes={quotes} />
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
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
