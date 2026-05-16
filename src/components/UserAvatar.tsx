"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROFILE_DECORATION,
  normalizeProfileDecoration,
  type ProfileDecoration,
} from "@/lib/profile-decoration";

type UserAvatarProps = {
  imageUrl?: string | null;
  decoration?: ProfileDecoration | string | null;
  emoji?: string;
  bgColor?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
};

const decorationSizeMap: Record<
  NonNullable<UserAvatarProps["size"]>,
  string
> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  imageUrl,
  decoration = DEFAULT_PROFILE_DECORATION,
  emoji,
  bgColor = "#F1F5F9",
  size = "md",
}) => {
  const normalizedDecoration = normalizeProfileDecoration(decoration);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-visible",
        sizeMap[size],
      )}
      aria-label="프로필 이미지"
    >
      <div
        data-testid="profile-avatar-circle"
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-slate-200 shadow-sm"
        style={{ backgroundColor: bgColor }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : emoji ? (
          <span>{emoji}</span>
        ) : (
          <User className="h-1/2 w-1/2 text-slate-400" aria-hidden="true" />
        )}
      </div>
      <ProfileDecorationLayer
        decoration={normalizedDecoration}
        className={decorationSizeMap[size]}
      />
    </div>
  );
};

export function ProfileDecorationLayer({
  decoration,
  className,
}: {
  decoration: ProfileDecoration;
  className: string;
}) {
  if (decoration === "none") return null;

  const faceDecorations: ProfileDecoration[] = [
    "mic",
    "beard",
    "glasses",
    "sun-glasses",
  ];
  const position = faceDecorations.includes(decoration)
    ? "inset-0"
    : "-top-[42%] left-1/2 -translate-x-1/2";

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("pointer-events-none absolute z-10", position, className)}
      aria-hidden="true"
      data-profile-decoration={decoration}
    >
      <DecorationSvg decoration={decoration} />
    </svg>
  );
}

function DecorationSvg({ decoration }: { decoration: ProfileDecoration }) {
  switch (decoration) {
    case "cat":
      return (
        <g
          fill="none"
          stroke="#111827"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        >
          <path d="M20 36l4-13 8 8 8-8 4 13" fill="#FFFDF8" />
          <path d="M21 36c2 11 20 11 22 0" fill="#FFFDF8" />
          <circle cx="28" cy="37" r="1.5" fill="#111827" stroke="none" />
          <circle cx="36" cy="37" r="1.5" fill="#111827" stroke="none" />
          <path d="M32 39v3M25 44l-9 3M25 40l-10-1M39 44l9 3M39 40l10-1" />
        </g>
      );
    case "dog":
      return (
        <g
          fill="none"
          stroke="#111827"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        >
          <path d="M20 31c3-8 21-8 24 0v13c0 7-24 7-24 0z" fill="#FFFDF8" />
          <path d="M19 33c-8 3-9 16 0 18M45 33c8 3 9 16 0 18" fill="#111827" />
          <circle cx="27" cy="39" r="1.6" fill="#111827" stroke="none" />
          <circle cx="37" cy="39" r="1.6" fill="#111827" stroke="none" />
          <path d="M32 42c-2 2-2 4 0 5 2-1 2-3 0-5z" fill="#111827" />
        </g>
      );
    case "cap":
      return (
        <g
          stroke="#111827"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        >
          <path d="M15 39c6-18 29-18 36 0l-4 9H18z" fill="#F97373" />
          <path d="M10 47c13-4 29-4 44 0" fill="none" />
          <path d="M29 30h8v8h-8z" fill="#FACC15" />
        </g>
      );
    case "flower":
      return (
        <g
          transform="translate(0 4) scale(1 0.82)"
          stroke="#111827"
          strokeLinejoin="round"
          strokeWidth="3"
        >
          <circle cx="25" cy="32" r="7" fill="#F9A8D4" />
          <circle cx="39" cy="32" r="7" fill="#F9A8D4" />
          <circle cx="32" cy="22" r="7" fill="#F9A8D4" />
          <circle cx="32" cy="42" r="7" fill="#F9A8D4" />
          <circle cx="32" cy="32" r="5" fill="#FACC15" />
        </g>
      );
    case "crown":
      return (
        <g
          transform="translate(0 -4)"
          fill="#FACC15"
          stroke="#111827"
          strokeLinejoin="round"
          strokeWidth="4"
        >
          <path d="M14 48l5-22 13 15 13-15 5 22z" />
          <path
            d="M19 26l7 10 6-16 6 16 7-10"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "ribbon":
      return (
        <g stroke="#111827" strokeLinejoin="round" strokeWidth="4">
          <path d="M32 34L13 24v20z" fill="#F59E0B" />
          <path d="M32 34l19-10v20z" fill="#F59E0B" />
          <rect x="27" y="28" width="10" height="12" rx="2" fill="#FACC15" />
        </g>
      );
    case "star":
      return (
        <path
          d="M32 16l4 10 11 1-8 7 3 10-10-5-10 5 3-10-8-7 11-1z"
          fill="#FCD34D"
          stroke="#111827"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      );
    case "mic":
      return (
        <g
          fill="none"
          stroke="#111827"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        >
          <rect x="27" y="34" width="10" height="16" rx="5" fill="#A78BFA" />
          <path d="M22 44c0 7 20 7 20 0M32 50v7M26 57h12" />
        </g>
      );
    case "beard":
      return (
        <path
          d="M18 38c6-5 13-3 14 4 1-7 8-9 14-4-1 11-27 11-28 0z"
          fill="#92400E"
          stroke="#111827"
          strokeLinejoin="round"
          strokeWidth="3"
          transform="rotate(180 32 41)"
        />
      );
    case "glasses":
      return (
        <g fill="none" stroke="#111827" strokeWidth="4">
          <circle cx="23" cy="30" r="9" />
          <circle cx="41" cy="30" r="9" />
          <path d="M32 30h0" strokeLinecap="round" />
        </g>
      );
    case "sun-glasses":
      return (
        <g stroke="#111827" strokeLinejoin="round" strokeWidth="3">
          <path d="M14 25h16l-3 13H17z" fill="#111827" />
          <path d="M34 25h16l-3 13H37z" fill="#111827" />
          <path d="M30 29h4" />
        </g>
      );
    case "sprout":
      return (
        <g
          stroke="#111827"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        >
          <path d="M32 47V24" />
          <path d="M32 31c0-8 9-11 14-11-1 7-3 15-14 15z" fill="#86EFAC" />
          <path d="M32 35c0-7-9-10-14-10 1 7 3 14 14 14z" fill="#4ADE80" />
        </g>
      );
    default:
      return null;
  }
}
