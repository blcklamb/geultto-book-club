"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionUser } from "@/lib/auth";
import { createClient } from "@supabase/client";

type SessionContextValue = {
  supabase: SupabaseClient;
  session: { user: SessionUser | null };
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

export function SessionProvider({
  children,
  initialSessionUser,
}: {
  children: ReactNode;
  initialSessionUser: SessionUser | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(
    initialSessionUser
  );

  const loadProfileForActiveSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setSessionUser(null);
      router.refresh();
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id, nickname, role, expires_at")
      .eq("id", session.user.id)
      .single();

    setSessionUser(
      profile
        ? {
            id: profile.id,
            nickname: profile.nickname,
            role: profile.role,
            expiresAt: profile.expires_at,
          }
        : null
    );
    router.refresh();
  }, [router, supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSessionUser(null);
        router.refresh();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void loadProfileForActiveSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfileForActiveSession, router, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    router.refresh();
  }, [router, supabase]);

  const value = useMemo(
    () => ({
      supabase,
      session: { user: sessionUser },
      refreshSession: loadProfileForActiveSession,
      signOut,
    }),
    [loadProfileForActiveSession, sessionUser, signOut, supabase]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
