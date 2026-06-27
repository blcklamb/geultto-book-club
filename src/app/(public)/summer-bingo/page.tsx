import type { Metadata } from "next";
import { SummerBingoPage } from "@/features/summer-bingo/SummerBingoPage";

export const metadata: Metadata = {
  title: "여름 책 팔레트 | 글또 북클럽",
  description:
    "여름 독서 활동을 사진으로 채우고 로그인 계정에 책 팔레트를 저장하세요.",
};

export default function Page() {
  return <SummerBingoPage />;
}
