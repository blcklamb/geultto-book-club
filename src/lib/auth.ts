import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@supabase/server";

export type SessionUser = {
  id: string;
  role: "pending" | "member" | "admin";
  nickname: string;
  expiresAt: string | null;
  isDeactivated: boolean;
};

// Cached session fetcher so multiple server components reuse the same lookup.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, nickname, role, expires_at, is_deactivated")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Fallback when profile row is missing or not readable (e.g., RLS not configured yet).
    return {
      id: user.id,
      role: "pending",
      nickname:
        (user.user_metadata as Record<string, string | undefined>)?.name ??
        "멤버",
      expiresAt: null,
      isDeactivated: false,
    };
  }

  return {
    id: profile.id,
    role: profile.role,
    nickname: profile.nickname,
    expiresAt: profile.expires_at,
    isDeactivated: !!profile.is_deactivated,
  };
});

export const ensureRole = async (
  allowedRoles: Array<SessionUser["role"]>,
  options?: { redirectTo?: string }
) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(options?.redirectTo ?? "/auth/login");
  }
  if (sessionUser.isDeactivated) {
    redirect(options?.redirectTo ?? "/pending");
  }
  if (!allowedRoles.includes(sessionUser.role)) {
    redirect(options?.redirectTo ?? "/pending");
  }
  return sessionUser;
};
