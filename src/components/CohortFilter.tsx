"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export const CohortFilter: React.FC<{
  cohorts: number[];
  selected: number | null;
}> = ({ cohorts, selected }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (cohort: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cohort === null) {
      params.delete("cohort");
    } else {
      params.set("cohort", String(cohort));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div
      role="group"
      aria-label="기수 필터"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1"
    >
      <Button
        size="sm"
        variant={selected === null ? "default" : "ghost"}
        aria-pressed={selected === null}
        onClick={() => handleSelect(null)}
      >
        전체
      </Button>
      {cohorts.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={selected === c ? "default" : "ghost"}
          aria-pressed={selected === c}
          onClick={() => handleSelect(c)}
        >
          {c}기
        </Button>
      ))}
    </div>
  );
};
