import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

const PROFILE_IMAGE_BUCKET = "profile-images";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  if (!userId || userId !== sessionUser.id) {
    return NextResponse.json(
      { message: "본인만 수정 가능합니다." },
      { status: 403 },
    );
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
    return NextResponse.json(
      { message: "닉네임과 실명은 필수입니다." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", userId);
  if (error) {
    return NextResponse.json(
      { message: "업데이트 실패", error: error.message },
      { status: 400 },
    );
  }

  const profileImage = formData.get("profileImage");
  let profileImageUrl: string | null | undefined;

  if (profileImage instanceof File && profileImage.size > 0) {
    if (!ALLOWED_PROFILE_IMAGE_TYPES.has(profileImage.type)) {
      return NextResponse.json(
        { message: "지원하지 않는 이미지 형식입니다." },
        { status: 400 },
      );
    }
    if (profileImage.size > MAX_PROFILE_IMAGE_SIZE) {
      return NextResponse.json(
        { message: "프로필 이미지는 5MB 이하만 업로드할 수 있습니다." },
        { status: 400 },
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
      return NextResponse.json(
        { message: "이미지 업로드 실패", error: uploadError.message },
        { status: 400 },
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
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      return NextResponse.json(
        { message: "프로필 이미지 저장 실패", error: profileError.message },
        { status: 400 },
      );
    }
  } else {
    await supabase
      .from("user_profiles")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
  }

  return NextResponse.redirect(new URL("/profile", req.url));
}
