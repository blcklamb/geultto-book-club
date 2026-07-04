"use client";

import { LocalizedDate } from "@/components/LocalizedDate";

type ScheduleDateProps = {
  value: string | number | Date | null | undefined;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
  className?: string;
};

export function ScheduleDate({ options, ...props }: ScheduleDateProps) {
  return (
    <LocalizedDate
      {...props}
      options={{
        ...options,
        timeZone: "UTC",
      }}
    />
  );
}
