"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { UserAvatar } from "./UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { getVisibleNavItems } from "@/lib/navigation";

const adminItems = [
  { href: "/admin/points", label: "포인트" },
  { href: "/admin/schedule", label: "일정 관리" },
  { href: "/admin/users", label: "회원 승인" },
];

const desktopLinkClass = (active: boolean) =>
  cn(
    "rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

const mobileLinkClass = (active: boolean) =>
  cn(
    "rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-muted font-semibold text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { session, signOut } = useSession();
  const profileImage = useProfileImage();

  const isAdmin = session.user?.role === "admin";
  const visibleNavItems = getVisibleNavItems(!!session.user);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        >
          <BrandLogo />
          <span>글또 북클럽</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav
          aria-label="주요 메뉴"
          className="hidden gap-6 text-sm font-semibold md:flex"
        >
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              className={desktopLinkClass(pathname.startsWith(item.href))}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin
            ? adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    pathname.startsWith(item.href) ? "page" : undefined
                  }
                  className={desktopLinkClass(pathname.startsWith(item.href))}
                >
                  {item.label}
                </Link>
              ))
            : null}
        </nav>

        {/* 데스크톱 유저 영역 */}
        <div className="hidden items-center gap-3 md:flex">
          {!session.user ? (
            <Button asChild variant="outline">
              <Link href="/auth/login">카카오로 로그인</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <UserAvatar
                imageUrl={profileImage.imageUrl}
                decoration={profileImage.decoration}
                size="sm"
              />
              <span className="text-sm text-muted-foreground">
                {session.user.nickname}
              </span>
              {isAdmin ? <Badge variant="secondary">관리자</Badge> : null}
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
                  <BrandLogo />
                  글또 북클럽
                </SheetTitle>
              </SheetHeader>

              {/* 유저 정보 */}
              {session.user && (
                <div className="mb-6 flex items-center gap-3 border-b border-border pb-6">
                  <UserAvatar
                    imageUrl={profileImage.imageUrl}
                    decoration={profileImage.decoration}
                    size="sm"
                  />
                  <span className="text-sm text-foreground">
                    {session.user.nickname}
                  </span>
                  {isAdmin ? <Badge variant="secondary">관리자</Badge> : null}
                </div>
              )}

              {/* 메뉴 항목 */}
              <nav aria-label="주요 메뉴" className="flex flex-col gap-1">
                {visibleNavItems.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={
                        pathname.startsWith(item.href) ? "page" : undefined
                      }
                      className={mobileLinkClass(pathname.startsWith(item.href))}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                {isAdmin
                  ? adminItems.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={
                            pathname.startsWith(item.href) ? "page" : undefined
                          }
                          className={mobileLinkClass(
                            pathname.startsWith(item.href),
                          )}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))
                  : null}
              </nav>

              {/* 로그인/로그아웃 */}
              <div className="mt-6 border-t border-border pt-6">
                {!session.user ? (
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth/login">카카오로 로그인</Link>
                    </Button>
                  </SheetClose>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
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
