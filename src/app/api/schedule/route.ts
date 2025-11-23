import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("schedules")
    .select("id, date, place, book_title, book_link, genre_tag")
    .order("date", { ascending: true });
  return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ message: "권한이 없습니다." }, { status: 403 });
  }
  const payload = await req.json();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("schedules").insert([
    {
      date: payload.date,
      place: payload.place,
      book_title: payload.bookTitle,
      book_link: payload.bookLink,
      genre_tag: payload.genre,
    },
  ]);
  if (error) {
    return NextResponse.json(
      { message: "등록 실패", error: error.message },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
