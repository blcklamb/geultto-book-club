import "@/styles/globals.css";
import type { Metadata } from "next";
import { FlashMessage } from "@/components/FlashMessage";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "글또 5기 북클럽",
  description: "글또 5기 독서모임 커뮤니티 플랫폼",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "글또 5기 북클럽",
    description: "글또 5기 독서모임 커뮤니티 플랫폼",
    type: "website",
    locale: "ko_KR",
    siteName: "글또 북클럽",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "글또 5기 북클럽",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "글또 5기 북클럽",
    description: "글또 5기 독서모임 커뮤니티 플랫폼",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  return (
    <html lang="ko">
      <body className="min-h-screen">
        <SessionProvider initialSessionUser={sessionUser}>
          <FlashMessage />
          <Toaster position="top-center" richColors closeButton />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
