import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { normalizeProfileDecoration } from "@/lib/profile-decoration";

const PROFILE_IMAGE_BUCKET = "profile-images";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function redirectProfileWithMessage(
  req: NextRequest,
  type: "error" | "success",
  message: string,
) {
  const url = new URL("/profile", req.url);
  url.searchParams.set(type, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return redirectProfileWithMessage(req, "error", "로그인이 필요합니다.");
  }
  if (sessionUser.isDeactivated) {
    return redirectProfileWithMessage(req, "error", "비활성화된 계정입니다.");
  }

  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  if (!userId || userId !== sessionUser.id) {
    return redirectProfileWithMessage(req, "error", "본인만 수정 가능합니다.");
  }

  const payload = {
    nickname: formData.get("nickname")?.toString(),
    real_name: formData.get("realName")?.toString(),
    favorite_genres:
      formData
        .get("favoriteGenres")
        ?.toString()
        ?.split(",")
        .map((v) => v.trim())
        .filter(Boolean) ?? [],
    recommended_book: formData.get("recommendedBook")?.toString(),
  };

  if (!payload.nickname || !payload.real_name) {
    return redirectProfileWithMessage(req, "error", "닉네임과 실명은 필수입니다.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", userId);
  if (error) {
    return redirectProfileWithMessage(
      req,
      "error",
      `업데이트 실패: ${error.message}`,
    );
  }

  const profileImage = formData.get("profileImage");
  const profileDecoration = normalizeProfileDecoration(
    formData.get("profileDecoration")?.toString()
  );
  let profileImageUrl: string | null | undefined;

  if (profileImage instanceof File && profileImage.size > 0) {
    if (!ALLOWED_PROFILE_IMAGE_TYPES.has(profileImage.type)) {
      return redirectProfileWithMessage(
        req,
        "error",
        "지원하지 않는 이미지 형식입니다.",
      );
    }
    if (profileImage.size > MAX_PROFILE_IMAGE_SIZE) {
      return redirectProfileWithMessage(
        req,
        "error",
        "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.",
      );
    }

    const extension =
      profileImage.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ??
      "jpg";
    const imagePath = `${userId}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(imagePath, profileImage, {
        contentType: profileImage.type,
        upsert: true,
      });

    if (uploadError) {
      return redirectProfileWithMessage(
        req,
        "error",
        `이미지 업로드 실패: ${uploadError.message}`,
      );
    }

    const { data } = supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .getPublicUrl(imagePath);
    profileImageUrl = data.publicUrl;
  }

  if (profileImageUrl !== undefined) {
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          profile_image_url: profileImageUrl,
          profile_decoration: profileDecoration,
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      return redirectProfileWithMessage(
        req,
        "error",
        `프로필 이미지 저장 실패: ${profileError.message}`,
      );
    }
  } else {
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        { user_id: userId, profile_decoration: profileDecoration },
        { onConflict: "user_id" }
      );
    if (profileError) {
      return redirectProfileWithMessage(
        req,
        "error",
        `프로필 저장 실패: ${profileError.message}`,
      );
    }
  }

  return redirectProfileWithMessage(req, "success", "프로필이 저장되었습니다.");
}
