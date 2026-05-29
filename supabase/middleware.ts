import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ensureUserProfile } from "@/lib/ensure-user-profile";
import type { Database } from "@supabase/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  // Dedicated OAuth routes have their own handlers that exchange the code.
  // If we exchange here first, the handler re-runs with no `code` and falls
  // through to its error branch.
  const hasDedicatedHandler =
    requestUrl.pathname === "/auth/callback" ||
    requestUrl.pathname === "/auth/confirm";

  // Handle OAuth callback codes when they arrive at paths without a dedicated handler.
  if (code && !hasDedicatedHandler) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await ensureUserProfile(supabase, user);
      }

      const redirectUrl = new URL(
        next ?? requestUrl.pathname,
        requestUrl.origin
      );
      redirectUrl.searchParams.forEach((_, key) => {
        if (["code", "state", "next"].includes(key)) {
          redirectUrl.searchParams.delete(key);
        }
      });

      const redirectResponse = NextResponse.redirect(redirectUrl);
      // Carry over cookies set during the exchange.
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  // refreshing the auth token
  await supabase.auth.getUser();

  return supabaseResponse;
}
