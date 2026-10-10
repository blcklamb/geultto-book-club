"use client";

import { useEffect, useState, type ComponentProps } from "react";
import type { ReviewEditor } from "./ReviewEditor";
import { Button } from "./ui/button";

export function ReviewEditorLazy(props: ComponentProps<typeof ReviewEditor>) {
  const [Editor, setEditor] = useState<typeof ReviewEditor | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    setFailed(false);
    void import("./ReviewEditor").then(module => {
      if (mounted) setEditor(() => module.ReviewEditor);
    }).catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, []);
  if (Editor) return <Editor {...props} />;
  if (failed) return <p role="alert">편집기를 불러오지 못했습니다. <Button type="button" variant="ghost" onClick={() => window.location.reload()}>새로고침</Button></p>;
  return <p role="status" className="py-4 text-sm text-muted-foreground">편집기를 불러오는 중입니다…</p>;
}
