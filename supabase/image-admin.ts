import "server-only";
import { createClient } from "@supabase/supabase-js";

// Never attach browser cookies or expose this credential in client components.
export function createImageAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("이미지 저장소 서버 설정이 필요합니다.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
