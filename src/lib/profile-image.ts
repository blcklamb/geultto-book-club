import type { Database } from "@supabase/types";
import {
  DEFAULT_PROFILE_DECORATION,
  normalizeProfileDecoration,
  type ProfileDecoration,
} from "@/lib/profile-decoration";

export type ProfileImage = {
  profileImageUrl: string | null;
  profileDecoration: ProfileDecoration;
};

export type UserProfileRow =
  Database["public"]["Tables"]["user_profiles"]["Row"];

export function profileImageFromRow(
  row?: Partial<UserProfileRow> | null
): ProfileImage {
  return {
    profileImageUrl: row?.profile_image_url ?? null,
    profileDecoration: normalizeProfileDecoration(
      row?.profile_decoration ?? DEFAULT_PROFILE_DECORATION
    ),
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
