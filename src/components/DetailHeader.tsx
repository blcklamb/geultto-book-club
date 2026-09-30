"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <h1 className="text-base font-semibold">{title}</h1>

        <button
          type="button"
          onClick={handleProfileClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent disabled:opacity-50"
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
