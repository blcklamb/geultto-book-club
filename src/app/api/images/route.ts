import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import {
  CONTENT_IMAGE_BUCKET,
  validateImageFile,
  imageSignatureMatches,
  parseComment,
} from "@/lib/content-images";

async function getActiveUser() {
  const user = await getSessionUser();
  if (!user || user.role === "pending" || user.isDeactivated)
    return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  if (!user)
    return NextResponse.json(
      { message: "승인된 활성 회원만 이미지를 첨부할 수 있습니다." },
      { status: 403 },
    );
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (!(value instanceof File)) throw new Error("이미지를 선택해주세요.");
    const file = value;
    const metadata = {
      type: file.type,
      size: file.size,
      signature: Array.from(new Uint8Array(await file.slice(0, 12).arrayBuffer())),
    };
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
    const { error } = await supabase.storage
      .from(CONTENT_IMAGE_BUCKET)
      .upload(path, file, { contentType: metadata.type, upsert: false });
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

export async function DELETE(req: NextRequest) {
  const user = await getActiveUser();
  if (!user)
    return NextResponse.json(
      { message: "승인된 활성 회원만 이미지를 제거할 수 있습니다." },
      { status: 403 },
    );
  try {
    const { path } = await req.json();
    parseComment("", [path], user.id);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(CONTENT_IMAGE_BUCKET)
      .remove([path]);
    if (error)
      return NextResponse.json(
        { message: "이미지를 제거하지 못했습니다. 다시 시도해주세요." },
        { status: 500 },
      );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "이미지 제거 요청이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }
}
