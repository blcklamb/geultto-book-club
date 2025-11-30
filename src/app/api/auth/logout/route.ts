import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", req.url));
  return response;
}
