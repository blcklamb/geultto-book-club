import "./globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "글또 북클럽",
  description: "독서 모임을 위한 커뮤니티 플랫폼",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <SessionProvider initialSessionUser={sessionUser}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
