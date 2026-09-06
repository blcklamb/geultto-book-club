import { NextRequest, NextResponse } from "next/server";
import { createImageAdminClient } from "@supabase/image-admin";
import { CONTENT_IMAGE_BUCKET, CONTENT_IMAGE_DRAFT_BUCKET } from "@/lib/content-images";

// Signed upload tokens expire before this 24-hour retention window.
// Keeping tombstones until expiry also catches a PUT that finishes after DELETE.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new NextResponse(null, { status: 401 });
  const db = createImageAdminClient();
  const { data, error } = await db.from("content_image_drafts").select("id,path,state")
    .lt("expires_at", new Date().toISOString()).order("expires_at").limit(1000);
  if (error) return new NextResponse(null, { status: 500 });
  for (const draft of data ?? []) {
    if (draft.path) {
      const referenced = await db.rpc("content_image_is_referenced", { p_path: draft.path });
      if (referenced.error) return new NextResponse(null, { status: 500 });
      const buckets = referenced.data
        ? [CONTENT_IMAGE_DRAFT_BUCKET] : [CONTENT_IMAGE_DRAFT_BUCKET, CONTENT_IMAGE_BUCKET];
      for (const bucket of buckets) {
        const removed = await db.storage.from(bucket).remove([draft.path]);
        if (removed.error) return new NextResponse(null, { status: 500 });
      }
    }
    const deleted = await db.from("content_image_drafts").delete().eq("id", draft.id);
    if (deleted.error) return new NextResponse(null, { status: 500 });
  }
  return NextResponse.json({ cleaned: data?.length ?? 0 });
}
