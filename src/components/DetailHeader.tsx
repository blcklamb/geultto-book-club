"use client";

import { useRouter } from "next/navigation";

interface DetailHeaderProps {
  title: string;
  profileEmoji?: string;
}

export default function DetailHeader({
  title,
  profileEmoji = "👤",
}: DetailHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
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
      >
        {profileEmoji}
      </button>
    </header>
  );
}
