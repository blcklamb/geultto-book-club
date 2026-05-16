import { ensureRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileImageField } from "@/components/ProfileImageField";
import { ProfileHeader } from "./ProfileHeader";

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
    .select("profile_image_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <ProfileHeader />
      <div className="p-8">
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
              />
              <Button type="submit">저장</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
