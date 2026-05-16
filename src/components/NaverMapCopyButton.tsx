"use client";

import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

type NaverMapCopyButtonProps = {
  searchValue?: string | null;
};

export function NaverMapCopyButton({ searchValue }: NaverMapCopyButtonProps) {
  const handleClick = () => {
    const query = encodeURIComponent(searchValue ?? "");
    const webUrl = `https://map.naver.com/p/search/${query}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      const appUrl = `nmap://search?query=${query}&appname=com.geultto.bookclub`;
      window.location.href = appUrl;

      // App이 설치되어 있으면 페이지가 숨겨지므로 fallback을 취소
      const timer = setTimeout(() => {
        window.location.href = webUrl;
      }, 1500);

      const cancel = () => clearTimeout(timer);
      document.addEventListener("visibilitychange", cancel, { once: true });
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Button
      type="button"
      variant="link"
      className="h-6 px-2 text-slate-500"
      onClick={handleClick}
      aria-label="네이버 지도에서 보기"
    >
      <MapPin className="h-4 w-4 text-slate-500" />
    </Button>
  );
}
