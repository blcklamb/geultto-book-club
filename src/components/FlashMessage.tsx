"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

function FlashMessageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handledKeyRef = useRef<string | null>(null);

  const error = searchParams.get("error");
  const success = searchParams.get("success");

  useEffect(() => {
    if (!error && !success) {
      handledKeyRef.current = null;
      return;
    }

    const handledKey = `${pathname}:${error ?? ""}:${success ?? ""}`;
    if (handledKeyRef.current === handledKey) return;
    handledKeyRef.current = handledKey;

    if (error) {
      toast.error(error, { id: `${pathname}:error` });
    }

    if (success) {
      toast.success(success, { id: `${pathname}:success` });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    params.delete("success");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [error, success, pathname, router, searchParams]);

  return null;
}

export function FlashMessage() {
  return (
    <Suspense fallback={null}>
      <FlashMessageInner />
    </Suspense>
  );
}
