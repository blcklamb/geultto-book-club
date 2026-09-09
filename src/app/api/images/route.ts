import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createImageAdminClient } from "@supabase/image-admin";
import {
  CONTENT_IMAGE_BUCKET, CONTENT_IMAGE_DRAFT_BUCKET,
  validateImageFile, imageSignatureMatches, parseComment,
} from "@/lib/content-images";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};
async function activeUser() {
  const user = await getSessionUser();
  return user && user.role !== "pending" && !user.isDeactivated ? user : null;
}
function failure(error: unknown) {
  return NextResponse.json({ message: error instanceof Error ? error.message : "이미지 요청 실패" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const user = await activeUser();
  if (!user) return NextResponse.json({ message: "승인된 활성 회원만 이미지를 첨부할 수 있습니다." }, { status: 403 });
  try {
    const input = await req.json();
    if (!uuid.test(input.id ?? "")) throw new Error("업로드 ID가 올바르지 않습니다.");
    const db = createImageAdminClient();
    if (input.action === "prepare") {
      validateImageFile(input);
      const path = `${user.id}/${input.id}.${extensions[input.type]}`;
      // A cancellation arriving first leaves a tombstone; INSERT cannot overwrite it.
      const { error } = await db.from("content_image_drafts").insert({
        id: input.id, owner_id: user.id, path, mime_type: input.type, byte_size: input.size,
      });
      if (error) throw new Error("취소되었거나 이미 사용한 업로드입니다. 다시 시도해주세요.");
      const signed = await db.storage.from(CONTENT_IMAGE_DRAFT_BUCKET).createSignedUploadUrl(path);
      if (signed.error) throw new Error("이미지 업로드를 준비하지 못했습니다.");
      return NextResponse.json({ uploadUrl: signed.data.signedUrl }, { status: 201 });
    }
    if (input.action !== "finalize") throw new Error("이미지 요청이 올바르지 않습니다.");
    const { data: draft, error } = await db.from("content_image_drafts")
      .update({ state: "validating" }).eq("id", input.id).eq("owner_id", user.id)
      .eq("state", "uploading").gt("expires_at", new Date().toISOString()).select("*").maybeSingle();
    if (error || !draft) throw new Error("취소되었거나 만료된 업로드입니다.");
    try {
      const stored = await db.storage.from(CONTENT_IMAGE_DRAFT_BUCKET).download(draft.path);
      if (stored.error || !stored.data) throw new Error("이미지를 읽지 못했습니다.");
      const file = stored.data;
      validateImageFile({ type: draft.mime_type, size: file.size });
      const bytes = Array.from(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
      if (file.size !== draft.byte_size || !imageSignatureMatches(draft.mime_type, bytes))
        throw new Error("파일 내용이 이미지 형식 또는 크기와 일치하지 않습니다.");
      const uploaded = await db.storage.from(CONTENT_IMAGE_BUCKET)
        .upload(draft.path, file, { contentType: draft.mime_type, upsert: false });
      if (uploaded.error) throw new Error("이미지를 저장하지 못했습니다.");
      // Cancellation and publication race on the same row; only one state wins.
      const completed = await db.from("content_image_drafts").update({ state: "ready" })
        .eq("id", input.id).eq("state", "validating").select("id").maybeSingle();
      if (completed.error || !completed.data) throw new Error("취소된 업로드입니다.");
      await db.storage.from(CONTENT_IMAGE_DRAFT_BUCKET).remove([draft.path]);
      const { data } = db.storage.from(CONTENT_IMAGE_BUCKET).getPublicUrl(draft.path);
      return NextResponse.json({ path: draft.path, url: data.publicUrl }, { status: 201 });
    } catch (error) {
      await db.from("content_image_drafts").update({ state: "cancelled" }).eq("id", input.id);
      await db.storage.from(CONTENT_IMAGE_BUCKET).remove([draft.path]);
      await db.storage.from(CONTENT_IMAGE_DRAFT_BUCKET).remove([draft.path]);
      throw error;
    }
  } catch (error) { return failure(error); }
}

export async function DELETE(req: NextRequest) {
  const user = await activeUser();
  if (!user) return NextResponse.json({ message: "승인된 활성 회원만 이미지를 제거할 수 있습니다." }, { status: 403 });
  try {
    const { id, path } = await req.json();
    const db = createImageAdminClient();
    let target = path;
    if (id !== undefined) {
      if (!uuid.test(id)) throw new Error("업로드 ID가 올바르지 않습니다.");
      // Ignore duplicate IDs, then update only this user's row.
      const inserted = await db.from("content_image_drafts").upsert(
        { id, owner_id: user.id, state: "cancelled" },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (inserted.error) throw new Error("업로드 취소에 실패했습니다.");
      const cancelled = await db.from("content_image_drafts").update({ state: "cancelled" })
        .eq("id", id).eq("owner_id", user.id).select("path").maybeSingle();
      if (cancelled.error || !cancelled.data) throw new Error("업로드 취소에 실패했습니다.");
      target = cancelled.data.path ?? path;
    }
    if (target) {
      parseComment("", [target], user.id);
      for (const bucket of [CONTENT_IMAGE_BUCKET, CONTENT_IMAGE_DRAFT_BUCKET]) {
        const { error } = await db.storage.from(bucket).remove([target]);
        if (error) throw new Error("이미지를 제거하지 못했습니다. 다시 시도해주세요.");
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) { return failure(error); }
}
