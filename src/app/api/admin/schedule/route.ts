import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ message: "관리자 전용" }, { status: 403 });
  }
  const formData = await req.formData();
  const payload = {
    date: formData.get("date")?.toString(),
    place: formData.get("place")?.toString(),
    bookTitle: formData.get("bookTitle")?.toString(),
    bookLink: formData.get("bookLink")?.toString(),
    genre: formData.get("genre")?.toString(),
  };
  if (!payload.date || !payload.place || !payload.bookTitle) {
    return NextResponse.json({ message: "필수 값 누락" }, { status: 400 });
  }

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
  return NextResponse.redirect(new URL("/admin/schedule", req.url));
}
