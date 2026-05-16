"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getParentPathname } from "@/lib/navigation";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const fallbackHref = getParentPathname(pathname);

  useEffect(() => {
    if (pathname !== fallbackHref) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, pathname, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          페이지를 찾을 수 없습니다.
        </h1>
        <p className="text-sm text-slate-500">
          {pathname !== fallbackHref
            ? "상위 페이지로 이동합니다."
            : "홈으로 이동해 다시 시도해주세요."}
        </p>
        <Link
          href={fallbackHref}
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          돌아가기
        </Link>
      </div>
    </main>
  );
}
