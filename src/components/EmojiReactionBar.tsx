"use client";

import dynamic from "next/dynamic";
import { useOptimistic, useState, useTransition } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReactionSummary } from "@/lib/reactions";
import { sortReactions } from "@/lib/reactions";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-slate-500">이모지를 불러오는 중...</div>
  ),
});

type EmojiReactionBarProps = {
  initialReactions: ReactionSummary[];
  onToggle: (emoji: string) => Promise<ReactionSummary[]>;
  disabled?: boolean;
  currentUserNickname?: string;
};

export function EmojiReactionBar({
  initialReactions,
  onToggle,
  disabled = false,
  currentUserNickname,
}: EmojiReactionBarProps) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticReactions, toggleOptimistic] = useOptimistic(
    reactions,
    (state, emoji: string) => {
      const next = [...state];
      const index = next.findIndex((reaction) => reaction.emoji === emoji);
      const nickname = currentUserNickname?.trim();

      if (index >= 0) {
        const current = next[index];
        const toggled = !current.reactedByUser;
        const nextCount = current.count + (toggled ? 1 : -1);
        const nextNicknames = nickname
          ? toggled
            ? current.nicknames.includes(nickname)
              ? current.nicknames
              : [...current.nicknames, nickname]
            : current.nicknames.filter((name) => name !== nickname)
          : current.nicknames;

        if (nextCount <= 0) {
          next.splice(index, 1);
        } else {
          next[index] = {
            ...current,
            count: nextCount,
            reactedByUser: toggled,
            nicknames: nextNicknames,
          };
        }
      } else {
        next.push({
          emoji,
          count: 1,
          reactedByUser: true,
          nicknames: nickname ? [nickname] : [],
        });
      }

      return sortReactions(next);
    }
  );

  const handleToggle = (emoji: string) => {
    if (disabled) {
      setPickerOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        toggleOptimistic(emoji);
        const next = await onToggle(emoji);
        setReactions(next);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "이모지 반응을 저장하지 못했습니다."
        );
      }
    });
    setPickerOpen(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    handleToggle(emojiData.emoji);
  };
  return (
    <div>
      <TooltipProvider delayDuration={150}>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {optimisticReactions.length === 0 ? (
            <span className="text-xs text-slate-500">
              첫 반응을 남겨보세요.
            </span>
          ) : (
            optimisticReactions.map((reaction) => (
              <Tooltip key={reaction.emoji}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={reaction.reactedByUser ? "secondary" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => handleToggle(reaction.emoji)}
                    disabled={disabled || isPending}
                    aria-label={
                      reaction.nicknames.length > 0
                        ? `${reaction.nicknames.join(", ")} 님의 반응`
                        : "이모지 반응"
                    }
                  >
                    <span className="text-lg leading-none">
                      {reaction.emoji}
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {reaction.count}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {reaction.nicknames.length > 0
                    ? reaction.nicknames.join(", ")
                    : "아직 닉네임 정보가 없어요"}
                </TooltipContent>
              </Tooltip>
            ))
          )}
          <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || isPending}
                className="border border-dashed border-slate-200"
              >
                +
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="p-0"
              side="bottom"
              align="start"
              sideOffset={8}
            >
              <EmojiPicker
                lazyLoadEmojis
                height={360}
                width={320}
                searchPlaceholder="이모지 검색"
                previewConfig={{ showPreview: false }}
                onEmojiClick={handleEmojiClick}
                skinTonesDisabled={false}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
      {disabled ? (
        <p className="mt-2 text-xs text-slate-500">
          로그인하면 이모지로 반응을 남길 수 있어요.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
