import { useId } from "react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

const LEFT_PAGE = "M6 16Q18 13.5 30 18.5V50Q18 45.5 6 48Z";
const RIGHT_PAGE = "M34 18.5Q46 13.5 58 16V48Q46 45.5 34 50Z";

// 글또 북클럽 로고 마크: 펼친 책의 왼쪽 면에는 글줄, 오른쪽 면에는 책갈피.
// public/favicon.svg 와 같은 도형이며, 색은 디자인 토큰을 따른다.
export function BrandLogo({ className }: BrandLogoProps) {
  const clipId = `brand-logo-right-page-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={RIGHT_PAGE} />
        </clipPath>
      </defs>
      <g
        fill="var(--primary)"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d={LEFT_PAGE} />
        <path d={RIGHT_PAGE} />
      </g>
      <path
        d="M12 26.5H24M12 32.5H24M12 38.5H19.5"
        stroke="var(--primary-foreground)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M43.5 8H50.5V32L47 28.5L43.5 32Z"
        fill="var(--primary-foreground)"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
