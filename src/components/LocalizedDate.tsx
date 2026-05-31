"use client";

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
  const formatted = formatDate(value, locale, options);

  const dateTime =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string"
        ? value
        : typeof value === "number"
          ? new Date(value).toISOString()
          : undefined;

  return (
    <time className={className} dateTime={dateTime} suppressHydrationWarning>
      {formatted ?? fallback}
    </time>
  );
}
