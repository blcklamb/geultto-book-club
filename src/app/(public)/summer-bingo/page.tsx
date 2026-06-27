import type { Metadata } from "next";
import { SummerBingoPage } from "@/features/summer-bingo/SummerBingoPage";

export const metadata: Metadata = {
  title: "여름 책 빙고 | 글또 북클럽",
  description:
    "여름 독서 활동을 사진으로 채우고 로그인 계정에 빙고 판을 저장하세요.",
};

export default function Page() {
  return <SummerBingoPage />;
}
