import { Button } from "@/components/ui/button";

// Kakao login entrypoint page. The button triggers the /api/auth/login route handler
// which delegates to Supabase Auth's Kakao OAuth provider.
export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center space-y-6 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          카카오로 로그인
        </h1>
        <p className="text-sm text-slate-500">
          로그인 후에도 관리자의 승인이 있어야 주요 기능을 사용할 수 있습니다.
        </p>
      </div>
      <form action="/api/auth/login" method="post" className="w-full">
        <Button type="submit" className="w-full">
          카카오 계정으로 계속하기
        </Button>
      </form>
      <p className="text-xs text-slate-400">
        세션은 24시간 유지되며 이후 자동으로 만료됩니다.
      </p>
    </div>
  );
}
