"use client";

import { useState, useEffect } from "react";

type LocalizedDateProps = {
  value: string | number | Date | null | undefined;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
  className?: string;
};

function formatDate(
  value: LocalizedDateProps["value"],
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const merged = { timeZone: "Asia/Seoul", ...options };
  return new Intl.DateTimeFormat(locale, merged).format(date);
}

export function LocalizedDate({
  value,
  locale = "ko-KR",
  options,
  fallback = "-",
  className,
}: LocalizedDateProps) {
  // SSR에서는 빈 상태로 시작하고, 마운트 후 클라이언트에서 KST로 포맷한다.
  // suppressHydrationWarning은 SSR 값을 고정시키므로 사용하지 않는다.
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(formatDate(value, locale, options));
  }, [value, locale, options]);

  const dateTime =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string"
        ? value
        : typeof value === "number"
          ? new Date(value).toISOString()
          : undefined;

  return (
    <time className={className} dateTime={dateTime}>
      {formatted ?? fallback}
    </time>
  );
}
