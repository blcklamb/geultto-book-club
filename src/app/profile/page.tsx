import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileImageField } from "@/components/ProfileImageField";
import { LocalizedDate } from "@/components/LocalizedDate";
import { ProfileHeader } from "./ProfileHeader";
import { PointLogDialog } from "./PointLogDialog";
import { CURRENT_POINT_COHORT, getPointSourceLabel } from "@/lib/points";

// Profile page for members: edit nickname, real name, favorite genres, recommended book.
// Access control: ensureRole prevents pending users from editing (they can view via another page if needed).
export default async function ProfilePage() {
  const user = await ensureRole(["member", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("users")
    .select(
      "nickname, real_name, favorite_genres, recommended_book"
    )
    .eq("id", user.id)
    .single();
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("profile_image_url, profile_decoration")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: pointLogs } = await supabase
    .from("point_transactions")
    .select(
      "id, source_type, points, memo, created_at, schedule:schedules!point_transactions_schedule_id_fkey(book_title)"
    )
    .eq("user_id", user.id)
    .eq("cohort", CURRENT_POINT_COHORT)
    .order("created_at", { ascending: false });
  const pointTotal = (pointLogs ?? []).reduce(
    (sum, item) => sum + item.points,
    0
  );
  const formattedPointLogs =
    pointLogs?.map((log) => {
      const schedule = Array.isArray(log.schedule)
        ? log.schedule[0]
        : log.schedule;
      return {
        id: log.id,
        sourceType: log.source_type,
        points: log.points,
        memo: log.memo,
        createdAt: log.created_at,
        scheduleTitle: schedule?.book_title ?? null,
      };
    }) ?? [];

  return (
    <>
      <ProfileHeader />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>내 포인트</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {CURRENT_POINT_COHORT}기 현재 총점과 최근 적립/차감 내역입니다.
              </p>
            </div>
            <PointLogDialog logs={formattedPointLogs} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold text-slate-900">
              {pointTotal}점
            </div>
            <div className="space-y-2">
              {formattedPointLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-700">
                      {getPointSourceLabel(log.sourceType)}
                    </p>
                    <p className="text-xs text-slate-500">
                      <LocalizedDate
                        value={log.createdAt}
                        options={{ year: "numeric", month: "numeric", day: "numeric" }}
                      />
                      {log.scheduleTitle ? ` · ${log.scheduleTitle}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      log.points >= 0
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-rose-600"
                    }
                  >
                    {log.points > 0 ? "+" : ""}
                    {log.points}
                  </span>
                </div>
              ))}
              {formattedPointLogs.length === 0 ? (
                <p className="text-sm text-slate-500">
                  아직 포인트 로그가 없습니다.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>내 프로필</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action="/api/profile"
              method="post"
              encType="multipart/form-data"
              className="space-y-4"
            >
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nickname">닉네임 *</Label>
                  <Input
                    id="nickname"
                    name="nickname"
                    defaultValue={profile?.nickname ?? ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="realName">실명 *</Label>
                  <Input
                    id="realName"
                    name="realName"
                    defaultValue={profile?.real_name ?? ""}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteGenres">좋아하는 장르</Label>
                <Textarea
                  id="favoriteGenres"
                  name="favoriteGenres"
                  placeholder="콤마로 구분 (예: 심리, 경제)"
                  defaultValue={profile?.favorite_genres?.join(", ") ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recommendedBook">추천 도서</Label>
                <Input
                  id="recommendedBook"
                  name="recommendedBook"
                  defaultValue={profile?.recommended_book ?? ""}
                />
              </div>
              <ProfileImageField
                initialImageUrl={userProfile?.profile_image_url}
                initialDecoration={userProfile?.profile_decoration}
              />
              <Button type="submit">저장</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
