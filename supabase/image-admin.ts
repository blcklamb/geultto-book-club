import { createSupabaseAdminClient } from "./admin";

// Never attach browser cookies or expose this credential in client components.
export function createImageAdminClient() {
  return createSupabaseAdminClient("이미지 저장소 서버 설정이 필요합니다.");
}
