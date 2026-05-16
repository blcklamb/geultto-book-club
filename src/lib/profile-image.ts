import type { Database } from "@supabase/types";

export type ProfileImage = {
  profileImageUrl: string | null;
};

export type UserProfileRow =
  Database["public"]["Tables"]["user_profiles"]["Row"];

export function profileImageFromRow(
  row?: Partial<UserProfileRow> | null
): ProfileImage {
  return {
    profileImageUrl: row?.profile_image_url ?? null,
  };
}

export function profileImagesByUserId(rows?: Partial<UserProfileRow>[] | null) {
  return new Map(
    (rows ?? [])
      .filter((row): row is Partial<UserProfileRow> & { user_id: string } =>
        Boolean(row.user_id)
      )
      .map((row) => [row.user_id, profileImageFromRow(row)])
  );
}
