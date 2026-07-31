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
      <div className="h-64 w-full rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200" />
    ),
  },
);

export function HomeScene3DLazy(props: HomeScene3DLazyProps) {
  return <HomeScene3D {...props} />;
}
