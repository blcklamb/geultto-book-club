import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import {
  CONTENT_IMAGE_BUCKET,
  validateImageFile,
  imageSignatureMatches,
} from "@/lib/content-images";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "pending" || user.isDeactivated)
    return NextResponse.json(
      { message: "승인된 활성 회원만 이미지를 첨부할 수 있습니다." },
      { status: 403 },
    );
  try {
    // Large images go directly to Storage to stay below serverless request limits.
    const direct = req.headers
      .get("content-type")
      ?.includes("application/json");
    let file: File | undefined;
    let metadata: { type: string; size: number; signature: number[] };
    if (direct) {
      metadata = await req.json();
      if (!metadata || !Array.isArray(metadata.signature))
        throw new Error("이미지 정보가 올바르지 않습니다.");
    } else {
      const form = await req.formData();
      const value = form.get("file");
      if (!(value instanceof File)) throw new Error("이미지를 선택해주세요.");
      file = value;
      metadata = {
        type: file.type,
        size: file.size,
        signature: Array.from(
          new Uint8Array(await file.slice(0, 12).arrayBuffer()),
        ),
      };
    }
    validateImageFile(metadata);
    if (!imageSignatureMatches(metadata.type, metadata.signature))
      throw new Error("파일 내용이 이미지 형식과 일치하지 않습니다.");
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }[metadata.type];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const supabase = await createSupabaseServerClient();
    if (direct) {
      const { data, error } = await supabase.storage
        .from(CONTENT_IMAGE_BUCKET)
        .createSignedUploadUrl(path);
      if (error || !data)
        return NextResponse.json(
          { message: "이미지 업로드를 준비하지 못했습니다." },
          { status: 500 },
        );
      const { data: publicUrl } = supabase.storage
        .from(CONTENT_IMAGE_BUCKET)
        .getPublicUrl(path);
      return NextResponse.json(
        { path, url: publicUrl.publicUrl, uploadUrl: data.signedUrl },
        { status: 201 },
      );
    }
    const { error } = await supabase.storage
      .from(CONTENT_IMAGE_BUCKET)
      .upload(path, file!, { contentType: metadata.type, upsert: false });
    if (error)
      return NextResponse.json(
        { message: "이미지를 업로드하지 못했습니다. 다시 시도해주세요." },
        { status: 500 },
      );
    const { data } = supabase.storage
      .from(CONTENT_IMAGE_BUCKET)
      .getPublicUrl(path);
    return NextResponse.json({ path, url: data.publicUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "이미지 업로드 요청이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }
}
