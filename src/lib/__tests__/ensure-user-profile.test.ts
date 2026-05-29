import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  defaultProfileName,
  ensureUserProfile,
} from "../ensure-user-profile";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-05-29T00:00:00.000Z",
    ...overrides,
  } as User;
}

function makeSupabaseMock() {
  const usersUpsert = vi.fn().mockResolvedValue({ error: null });
  const profilesUpsert = vi.fn().mockResolvedValue({ error: null });

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return { upsert: usersUpsert };
        }
        if (table === "user_profiles") {
          return { upsert: profilesUpsert };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    },
    usersUpsert,
    profilesUpsert,
  };
}

describe("ensure-user-profile", () => {
  it("Kakao metadata name을 기본 프로필 이름으로 사용한다", () => {
    expect(
      defaultProfileName(
        makeUser({
          email: "fallback@example.com",
          user_metadata: { name: "카카오 사용자" },
        }),
      ),
    ).toBe("카카오 사용자");
  });

  it("name이 없으면 email, email도 없으면 기본 이름을 사용한다", () => {
    expect(defaultProfileName(makeUser({ email: "user@example.com" }))).toBe(
      "user@example.com",
    );
    expect(defaultProfileName(makeUser())).toBe("회원");
  });

  it("public.users와 public.user_profiles를 중복 무시 upsert한다", async () => {
    const { supabase, usersUpsert, profilesUpsert } = makeSupabaseMock();

    await ensureUserProfile(
      supabase as Parameters<typeof ensureUserProfile>[0],
      makeUser({
        email: "user@example.com",
        user_metadata: { name: "신규 멤버" },
      }),
    );

    expect(usersUpsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        nickname: "신규 멤버",
        real_name: "신규 멤버",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    expect(profilesUpsert).toHaveBeenCalledWith(
      { user_id: "user-1" },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  });
});
