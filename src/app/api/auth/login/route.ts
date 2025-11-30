import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.json(
      { message: "로그인에 실패했습니다.", error: error?.message },
      { status: 400 }
    );
  }

  return NextResponse.redirect(data.url, { status: 302 });
}
