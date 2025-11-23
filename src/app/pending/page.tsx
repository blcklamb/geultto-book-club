import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>관리자 승인 대기중입니다</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            카카오 인증은 완료되었지만 아직 관리자의 승인이 필요합니다. 승인되면
            독후감, 토론, 구절 등록 기능이 활성화됩니다.
          </p>
          <p className="text-xs text-slate-400">
            문의 사항이 있다면 운영진에게 연락해 주세요.
          </p>
          <Link href="/">
            <Button variant="outline">홈으로 돌아가기</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
