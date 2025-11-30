import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/reviews/[id]/view">
) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("view_count")
    .eq("id", (await ctx.params).id)
    .single();
  if (data) {
    await supabase
      .from("reviews")
      .update({ view_count: (data.view_count ?? 0) + 1 })
      .eq("id", (await ctx.params).id);
  }
  return NextResponse.json({ ok: true });
}
