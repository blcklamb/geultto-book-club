"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

interface DetailHeaderProps {
  title: string;
  profileEmoji?: string;
  onClickBack?: () => void;
}

// TODO: 커스텀훅으로 분리
export function useProfileEmoji(initialEmoji: string) {
  const { supabase, session } = useSession();
  const [emoji, setEmoji] = useState(initialEmoji);
  const userId = session.user?.id;

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const loadProfileEmoji = async () => {
      const { data: profile } = await supabase
        .from("users")
        .select("profile_emoji")
        .eq("id", userId)
        .single();

      if (isMounted && profile?.profile_emoji) {
        setEmoji(profile.profile_emoji);
      }
    };

    void loadProfileEmoji();

    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  return emoji;
}

export default function DetailHeader({
  title,
  profileEmoji = "👤",
  onClickBack,
}: DetailHeaderProps) {
  const router = useRouter();
  const dynamicEmoji = useProfileEmoji(profileEmoji);
  const pathname = usePathname();

  const handleBack = () => {
    onClickBack ? onClickBack() : router.back();
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <button
        onClick={handleBack}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="뒤로가기"
      >
        ←
      </button>

      <h1 className="text-lg font-semibold">{title}</h1>

      <button
        onClick={handleProfileClick}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-xl"
        aria-label="프로필로 이동"
        disabled={pathname === "/profile"}
      >
        {dynamicEmoji}
      </button>
    </header>
  );
}
