import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const userId = formData.get("userId")?.toString();
  if (!userId || userId !== sessionUser.id) {
    return NextResponse.json(
      { message: "본인만 수정 가능합니다." },
      { status: 403 }
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
    profile_emoji: formData.get("profileEmoji")?.toString(),
  };

  if (!payload.nickname || !payload.real_name) {
    return NextResponse.json(
      { message: "닉네임과 실명은 필수입니다." },
      { status: 400 }
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
      { status: 400 }
    );
  }
  return NextResponse.redirect(new URL("/profile", req.url));
}
