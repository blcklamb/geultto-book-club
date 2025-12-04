"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IterationCwIcon } from "lucide-react";
import { randomBookEmoji } from "@/lib/utils";

type ProfileEmojiFieldProps = {
  initialEmoji: string;
};

export function ProfileEmojiField({ initialEmoji }: ProfileEmojiFieldProps) {
  const [emoji, setEmoji] = useState(initialEmoji || "📚");

  const handleClick = () => {
    setEmoji(randomBookEmoji());
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">프로필 이모지</span>
        <span className="text-2xl">{emoji}</span>
      </div>
      <input type="hidden" name="profileEmoji" value={emoji} />
      <Button type="button" variant="outline" onClick={handleClick}>
        <IterationCwIcon />
      </Button>
    </div>
  );
}
