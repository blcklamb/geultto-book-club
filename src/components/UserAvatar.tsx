"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  imageUrl?: string | null;
  emoji?: string;
  bgColor?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  imageUrl,
  emoji,
  bgColor = "#F1F5F9",
  size = "md",
}) => {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 shadow-sm",
        sizeMap[size]
      )}
      style={{ backgroundColor: bgColor }}
      aria-label="프로필 이미지"
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
  );
};
