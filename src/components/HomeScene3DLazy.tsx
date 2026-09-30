"use client";

import dynamic from "next/dynamic";

type HomeScene3DLazyProps = {
  nextSchedule?: {
    id: string;
    date: string;
    place: string;
    book: string;
    bookLink?: string | null;
  };
  bookCoverUrl?: string | null;
};

const HomeScene3D = dynamic(
  () => import("@/components/HomeScene3D").then((mod) => mod.HomeScene3D),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 w-full animate-pulse rounded-lg border border-border bg-muted"
        role="status"
        aria-label="책 표지를 불러오는 중"
      />
    ),
  },
);

export function HomeScene3DLazy(props: HomeScene3DLazyProps) {
  return <HomeScene3D {...props} />;
}
