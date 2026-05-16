"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { UserAvatar } from "@/components/UserAvatar";

interface DetailHeaderProps {
  title: string;
  profileImageUrl?: string | null;
  onClickBack?: () => void;
}

// TODO: 커스텀훅으로 분리
export function useProfileImage(initialImageUrl: string | null = null) {
  const { supabase, session } = useSession();
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const userId = session.user?.id;

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const loadProfileImage = async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("profile_image_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (isMounted) {
        setImageUrl(profile?.profile_image_url ?? null);
      }
    };

    void loadProfileImage();

    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  return imageUrl;
}

export default function DetailHeader({
  title,
  profileImageUrl = null,
  onClickBack,
}: DetailHeaderProps) {
  const router = useRouter();
  const dynamicImageUrl = useProfileImage(profileImageUrl);
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
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="프로필로 이동"
        disabled={pathname === "/profile"}
      >
        <UserAvatar imageUrl={dynamicImageUrl} size="sm" />
      </button>
    </header>
  );
}
