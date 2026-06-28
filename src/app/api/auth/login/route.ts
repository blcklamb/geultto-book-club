import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getRequestOrigin } from "@/lib/request-origin";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const origin =
    process.env.NODE_ENV === "development"
      ? getRequestOrigin(req.headers, req.nextUrl.origin)
      : process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.json(
      { message: "로그인에 실패했습니다.", error: error?.message },
      { status: 400 },
    );
  }

  return NextResponse.redirect(data.url, { status: 302 });
}
