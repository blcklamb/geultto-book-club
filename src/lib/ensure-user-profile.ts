import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@supabase/types";

type UserNameSource = Pick<User, "email" | "user_metadata">;

export function defaultProfileName(user: UserNameSource) {
  const metadata = user.user_metadata as Record<string, string | undefined>;
  return (
    metadata.name ??
    metadata.full_name ??
    metadata.nickname ??
    user.email ??
    "회원"
  );
}

export async function ensureUserProfile(
  supabase: SupabaseClient<Database>,
  user: User,
) {
  const name = defaultProfileName(user);
  const { error: userError } = await supabase.from("users").upsert(
    {
      id: user.id,
      nickname: name,
      real_name: name,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (userError) {
    throw new Error(`사용자 프로필 생성 실패: ${userError.message}`);
  }

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  if (profileError) {
    throw new Error(`사용자 이미지 프로필 생성 실패: ${profileError.message}`);
  }
}
