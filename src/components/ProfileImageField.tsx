"use client";

import { useMemo, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";

type ProfileImageFieldProps = {
  initialImageUrl?: string | null;
};

export function ProfileImageField({ initialImageUrl }: ProfileImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialImageUrl ?? null
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const visibleUrl = useMemo(() => previewUrl ?? initialImageUrl ?? null, [
    initialImageUrl,
    previewUrl,
  ]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreviewUrl(initialImageUrl ?? null);
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setPreviewUrl(nextUrl);
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <UserAvatar imageUrl={visibleUrl} size="lg" />
        <div className="space-y-1 text-center sm:text-left">
          <p className="text-base font-semibold text-slate-700">
            프로필 이미지
          </p>
          <p className="text-sm text-slate-500">
            JPG, PNG, WebP, GIF 이미지를 업로드할 수 있어요.
          </p>
        </div>
      </div>

      <label
        htmlFor="profileImage"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
      >
        <ImagePlus className="h-5 w-5" />
        이미지 선택
      </label>
      <Input
        id="profileImage"
        name="profileImage"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleChange}
      />
    </section>
  );
}
