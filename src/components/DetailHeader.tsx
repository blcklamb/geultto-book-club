"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { getParentPathname } from "@/lib/navigation";

interface DetailHeaderProps {
  title: string;
  profileImageUrl?: string | null;
  profileDecoration?: string | null;
  onClickBack?: () => void;
  backHref?: string;
}

// TODO: 커스텀훅으로 분리
export function useProfileImage(
  initialImageUrl: string | null = null,
  initialDecoration = "none",
) {
  const { supabase, session } = useSession();
  const [profileImage, setProfileImage] = useState<{
    imageUrl: string | null;
    decoration: string;
  }>({ imageUrl: initialImageUrl, decoration: initialDecoration });
  const userId = session.user?.id;

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const loadProfileImage = async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("profile_image_url, profile_decoration")
        .eq("user_id", userId)
        .maybeSingle();

      if (isMounted) {
        setProfileImage({
          imageUrl: profile?.profile_image_url ?? null,
          decoration: profile?.profile_decoration ?? "none",
        });
      }
    };

    void loadProfileImage();

    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  return profileImage;
}

export default function DetailHeader({
  title,
  profileImageUrl = null,
  profileDecoration = "none",
  onClickBack,
  backHref,
}: DetailHeaderProps) {
  const router = useRouter();
  const dynamicProfileImage = useProfileImage(
    profileImageUrl,
    profileDecoration ?? "none",
  );
  const pathname = usePathname();

  const handleBack = () => {
    if (onClickBack) {
      onClickBack();
      return;
    }

    router.replace(backHref ?? getParentPathname(pathname));
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <>
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
          <UserAvatar
            imageUrl={dynamicProfileImage.imageUrl}
            decoration={dynamicProfileImage.decoration}
            size="sm"
          />
        </button>
      </header>
    </>
  );
}
