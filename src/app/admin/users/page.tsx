import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Admin user approval page.
export default async function AdminUsersPage() {
  await ensureRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: pendingUsers } = await supabase
    .from("users")
    .select("id, nickname, real_name, favorite_genres")
    .eq("role", "pending")
    .order("created_at", { ascending: true });

  return (
    <Card>
      <CardHeader>
        <CardTitle>승인 대기중인 회원</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingUsers?.length ? (
          pendingUsers.map((user) => (
            <form
              key={user.id}
              action="/api/admin/user-role"
              method="post"
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
            >
              <div>
                <p className="font-semibold text-slate-800">{user.nickname}</p>
                <p className="text-sm text-slate-500">{user.real_name}</p>
                <p className="text-xs text-slate-400">
                  {user.favorite_genres?.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="role" value="member" />
                <Button type="submit">승인</Button>
              </div>
            </form>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            승인 대기 중인 사용자가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
