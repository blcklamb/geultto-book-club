"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "./SessionProvider";
import { useProfileImage } from "./DetailHeader";

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
  const profileImageUrl = useProfileImage();

  const isAdmin = session.user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span className="inline-block h-8 w-8 rounded-lg bg-slate-900 text-center text-white py-1">
            📚
          </span>
          <span>글또 북클럽</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
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
          {isAdmin && (
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
          )}
        </nav>

        {/* 데스크톱 유저 영역 */}
        <div className="hidden items-center gap-3 md:flex">
          {!session.user ? (
            <Link href="/auth/login">
              <Button variant="outline">카카오로 로그인</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <UserAvatar
                emoji={isAdmin ? "🔧" : undefined}
                imageUrl={isAdmin ? undefined : profileImageUrl}
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

        {/* 모바일 햄버거 메뉴 */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="메뉴 열기">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <span className="inline-block h-7 w-7 rounded-lg bg-slate-900 text-center text-white py-0.5 text-sm">
                    📚
                  </span>
                  글또 북클럽
                </SheetTitle>
              </SheetHeader>

              {/* 유저 정보 */}
              {session.user && (
                <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
                  <UserAvatar
                    emoji={isAdmin ? "🔧" : undefined}
                    imageUrl={isAdmin ? undefined : profileImageUrl}
                    bgColor="#E2E8F0"
                    size="sm"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {session.user.nickname}
                  </span>
                </div>
              )}

              {/* 메뉴 항목 */}
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        pathname.startsWith(item.href)
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                {isAdmin && (
                  <SheetClose asChild>
                    <Link
                      href="/admin/schedule"
                      className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        pathname.startsWith("/admin")
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      Admin
                    </Link>
                  </SheetClose>
                )}
              </nav>

              {/* 로그인/로그아웃 */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                {!session.user ? (
                  <SheetClose asChild>
                    <Link href="/auth/login" className="block">
                      <Button variant="outline" className="w-full">
                        카카오로 로그인
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-600"
                    onClick={signOut}
                  >
                    로그아웃
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
