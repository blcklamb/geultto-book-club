"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { useSession } from "./SessionProvider";

const navItems = [
  { href: "/schedule", label: "일정" },
  { href: "/reviews", label: "독후감" },
  { href: "/quotes", label: "인상 깊은 구절" },
  { href: "/topics", label: "토론" },
  { href: "/profile", label: "내 프로필" },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { session, signOut } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span className="inline-block h-8 w-8 rounded-lg bg-slate-900 text-center text-white">
            📘
          </span>
          <span>글또 북클럽</span>
        </Link>
        <nav className="hidden gap-5 text-sm font-medium text-slate-600 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname.startsWith(item.href)
                  ? "text-slate-900"
                  : "transition hover:text-slate-900"
              }
            >
              {item.label}
            </Link>
          ))}
          {session.user?.role === "admin" ? (
            <Link
              href="/admin/schedule"
              className={
                pathname.startsWith("/admin")
                  ? "text-slate-900"
                  : "transition hover:text-slate-900"
              }
            >
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          {!session.user ? (
            <Link href="/auth/login">
              <Button variant="outline">카카오로 로그인</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <UserAvatar
                emoji={session.user.role === "admin" ? "🧠" : "📚"}
                bgColor="#E2E8F0"
                size="sm"
              />
              <span className="text-sm font-medium text-slate-600">
                {session.user.nickname}
              </span>
              <Button size="sm" variant="ghost" onClick={signOut}>
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
