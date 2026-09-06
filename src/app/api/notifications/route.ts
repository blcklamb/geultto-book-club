import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@supabase/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.isDeactivated)
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  const supabase = await createSupabaseServerClient();
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0)
    return NextResponse.json(
      { message: "잘못된 페이지입니다." },
      { status: 400 },
    );
  const id = req.nextUrl.searchParams.get("id");
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json(
      { message: "잘못된 알림입니다." },
      { status: 400 },
    );
  let query = supabase
    .from("highlight_notifications")
    .select("*")
    .eq("recipient_id", user.id);
  if (id) query = query.eq("id", id);
  const [list, unread] = await Promise.all([
    query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 29),
    supabase
      .from("highlight_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);
  if (list.error || unread.error)
    return NextResponse.json(
      { message: "알림을 불러오지 못했습니다." },
      { status: 500 },
    );
  return NextResponse.json(
    {
      notifications: list.data,
      unreadCount: unread.count ?? 0,
      hasMore: list.data.length === 30,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const readSchema = z.union([
  z.object({ ids: z.array(z.uuid()).min(1).max(100) }),
  z.object({ before: z.iso.datetime({ offset: true }) }),
]);
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.isDeactivated)
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  const parsed = readSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "잘못된 읽음 요청입니다." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(
    "read_highlight_notifications",
    "ids" in parsed.data
      ? { p_ids: parsed.data.ids }
      : { p_before: parsed.data.before },
  );
  if (error)
    return NextResponse.json(
      { message: "알림을 읽음 처리하지 못했습니다." },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
