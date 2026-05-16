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