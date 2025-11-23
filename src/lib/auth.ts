import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/supabase/server";

export type SessionUser = {
  id: string;
  role: "pending" | "member" | "admin";
  nickname: string;
  expiresAt: string | null;
};

// Cached session fetcher so multiple server components reuse the same lookup.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, nickname, role, expires_at")
    .eq("id", session.user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    nickname: profile.nickname,
    expiresAt: profile.expires_at,
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
  if (!allowedRoles.includes(sessionUser.role)) {
    redirect(options?.redirectTo ?? "/pending");
  }
  return sessionUser;
};
