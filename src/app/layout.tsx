import "@/styles/globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "글또 5기 북클럽",
  description: "글또 5기 독서모임 커뮤니티 플랫폼",
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
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
