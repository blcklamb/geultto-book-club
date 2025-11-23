"use client";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  emoji: string;
  bgColor?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  emoji,
  bgColor = "#F1F5F9",
  size = "md",
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-slate-200 shadow-sm",
        sizeMap[size]
      )}
      style={{ backgroundColor: bgColor }}
    >
      <span>{emoji}</span>
    </div>
  );
};
