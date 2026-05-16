import Link from "next/link";
import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LocalizedDate } from "@/components/LocalizedDate";
import {
  CURRENT_POINT_COHORT,
  MANUAL_POINT_OPTIONS,
  getPointSourceLabel,
  syncAutomaticPoints,
} from "@/lib/points";

export default async function AdminPointsPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    scheduleId?: string;
    sourceType?: string;
  }>;
}) {
  await ensureRole(["admin"]);
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  await syncAutomaticPoints(supabase);

  const { data: users } = await supabase
    .from("users")
    .select("id, nickname, real_name, role, is_deactivated")
    .order("created_at", { ascending: false });

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, book_title, date")
    .eq("cohort", CURRENT_POINT_COHORT)
    .order("date", { ascending: false });

  let transactionsQuery = supabase
    .from("point_transactions")
    .select(
      "id, user_id, schedule_id, source_type, points, memo, created_at, user:users!point_transactions_user_id_fkey(nickname), schedule:schedules!point_transactions_schedule_id_fkey(book_title)",
    )
    .eq("cohort", CURRENT_POINT_COHORT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.userId) {
    transactionsQuery = transactionsQuery.eq("user_id", filters.userId);
  }
  if (filters.scheduleId) {
    transactionsQuery = transactionsQuery.eq("schedule_id", filters.scheduleId);
  }
  if (filters.sourceType) {
    transactionsQuery = transactionsQuery.eq("source_type", filters.sourceType);
  }

  const { data: transactions } = await transactionsQuery;

  const { data: allTransactions } = await supabase
    .from("point_transactions")
    .select("user_id, points")
    .eq("cohort", CURRENT_POINT_COHORT);

  const totalsByUserId = new Map<string, number>();
  for (const transaction of allTransactions ?? []) {
    totalsByUserId.set(
      transaction.user_id,
      (totalsByUserId.get(transaction.user_id) ?? 0) + transaction.points,
    );
  }

  const selectedSourceTypes = [
    ...new Set((transactions ?? []).map((item) => item.source_type)),
  ];
  const filterSourceTypes = [
    ...new Set([
      ...MANUAL_POINT_OPTIONS.map((option) => option.sourceType),
      ...selectedSourceTypes,
    ]),
  ];

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            포인트 대시보드
          </h1>
          <p className="text-sm text-slate-500">
            {CURRENT_POINT_COHORT}기 포인트 현황 조회, 수동 입력, 비활성
            사용자를 관리합니다.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="text-sky-600" href="/admin/schedule">
            일정 관리
          </Link>
          <Link className="text-sky-600" href="/admin/users">
            회원 승인
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>수동 포인트 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action="/api/admin/points/manual"
            method="post"
            className="grid gap-4 md:grid-cols-4"
          >
            <div className="space-y-2">
              <Label htmlFor="manual-user">사용자</Label>
              <select
                id="manual-user"
                name="userId"
                required
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="">선택</option>
                {users?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nickname} ({user.real_name})
                    {user.is_deactivated ? " - 비활성" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-source">항목</Label>
              <select
                id="manual-source"
                name="sourceType"
                required
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="">선택</option>
                {MANUAL_POINT_OPTIONS.map((option) => (
                  <option key={option.sourceType} value={option.sourceType}>
                    {getPointSourceLabel(option.sourceType)} (
                    {option.points > 0 ? "+" : ""}
                    {option.points})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-schedule">일정</Label>
              <select
                id="manual-schedule"
                name="scheduleId"
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="">일정 없음</option>
                {schedules?.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.book_title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-memo">메모</Label>
              <Input id="manual-memo" name="memo" placeholder="선택" />
            </div>
            <Button type="submit" className="md:col-span-4">
              포인트 입력
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용자별 총점</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>총점</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.nickname}</div>
                    <div className="text-xs text-slate-500">
                      {user.real_name}
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="font-semibold">
                    {totalsByUserId.get(user.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    {user.is_deactivated ? "비활성" : "활성"}
                  </TableCell>
                  <TableCell>
                    <form
                      action="/api/admin/users/deactivation"
                      method="post"
                      className="inline-flex"
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="isDeactivated"
                        value={user.is_deactivated ? "false" : "true"}
                      />
                      <Button type="submit" size="sm" variant="outline">
                        {user.is_deactivated ? "활성화" : "비활성화"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>포인트 로그</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-3 md:grid-cols-4">
            <select
              name="userId"
              defaultValue={filters.userId ?? ""}
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="">전체 사용자</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nickname}
                </option>
              ))}
            </select>
            <select
              name="scheduleId"
              defaultValue={filters.scheduleId ?? ""}
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="">전체 일정</option>
              {schedules?.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.book_title}
                </option>
              ))}
            </select>
            <select
              name="sourceType"
              defaultValue={filters.sourceType ?? ""}
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="">전체 항목</option>
              {filterSourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {getPointSourceLabel(sourceType)}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              필터 적용
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>항목</TableHead>
                <TableHead>일정</TableHead>
                <TableHead>점수</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-xs text-slate-500">
                    <LocalizedDate
                      value={transaction.created_at}
                      options={{ dateStyle: "medium", timeStyle: "short" }}
                    />
                  </TableCell>
                  <TableCell>
                    {transaction.user?.nickname ?? transaction.user_id}
                  </TableCell>
                  <TableCell>
                    {getPointSourceLabel(transaction.source_type)}
                  </TableCell>
                  <TableCell>
                    {transaction.schedule?.book_title ?? "-"}
                  </TableCell>
                  <TableCell
                    className={
                      transaction.points >= 0
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-rose-600"
                    }
                  >
                    {transaction.points > 0 ? "+" : ""}
                    {transaction.points}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {transaction.memo ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
