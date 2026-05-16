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
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
      <Button
        size="sm"
        variant={selected === null ? "default" : "ghost"}
        onClick={() => handleSelect(null)}
      >
        전체
      </Button>
      {cohorts.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={selected === c ? "default" : "ghost"}
          onClick={() => handleSelect(c)}
        >
          {c}기
        </Button>
      ))}
    </div>
  );
};
