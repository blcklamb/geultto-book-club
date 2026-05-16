import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    const url = new URL("/pending", req.url);
    url.searchParams.set("error", "관리자 전용 페이지입니다");
    return NextResponse.redirect(url, 303);
  }
  const formData = await req.formData();
  const payload = {
    date: formData.get("date")?.toString(),
    place: formData.get("place")?.toString(),
    bookTitle: formData.get("bookTitle")?.toString(),
    bookLink: formData.get("bookLink")?.toString(),
    genre: formData.get("genre")?.toString(),
    cohort: formData.get("cohort")?.toString(),
  };
  if (!payload.date || !payload.place || !payload.bookTitle) {
    const url = new URL("/admin/schedule", req.url);
    url.searchParams.set("error", "날짜, 장소, 도서명은 필수입니다");
    return NextResponse.redirect(url, 303);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("schedules").insert([
    {
      date: payload.date,
      place: payload.place,
      book_title: payload.bookTitle,
      book_link: payload.bookLink,
      genre_tag: payload.genre,
      cohort: payload.cohort ? Number(payload.cohort) : null,
    },
  ]);
  if (error) {
    const url = new URL("/admin/schedule", req.url);
    url.searchParams.set("error", `등록 실패: ${error.message}`);
    return NextResponse.redirect(url, 303);
  }
  const url = new URL("/admin/schedule", req.url);
  url.searchParams.set("success", "일정이 등록되었습니다");
  return NextResponse.redirect(url, 303);
}
