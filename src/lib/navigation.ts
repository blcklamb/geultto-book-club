export const navItems = [
  { href: "/schedule", label: "일정", visibleWithoutLogin: true },
  { href: "/summer-palette", label: "여름 팔레트", visibleWithoutLogin: true },
  { href: "/reviews", label: "독후감", visibleWithoutLogin: false },
  { href: "/quotes", label: "인상 깊은 구절", visibleWithoutLogin: true },
  { href: "/topics", label: "토론", visibleWithoutLogin: false },
  { href: "/profile", label: "내 프로필", visibleWithoutLogin: false },
];

export function getVisibleNavItems(isLoggedIn: boolean) {
  return isLoggedIn
    ? navItems
    : navItems.filter((item) => item.visibleWithoutLogin);
}

export function getParentPathname(pathname: string | null | undefined) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return "/";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}
