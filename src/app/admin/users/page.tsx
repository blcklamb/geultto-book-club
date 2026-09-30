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
      <CardContent>
        {pendingUsers?.length ? (
          <div className="divide-y divide-border">
          {pendingUsers.map((user) => (
            <form
              key={user.id}
              action="/api/admin/user-role"
              method="post"
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-semibold text-foreground">{user.nickname}</p>
                <p className="text-sm text-muted-foreground">{user.real_name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.favorite_genres?.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="role" value="member" />
                <Button type="submit">{user.nickname} 승인</Button>
              </div>
            </form>
          ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            승인을 기다리는 회원이 없습니다. 새로 가입한 회원이 생기면 이곳에
            표시됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
