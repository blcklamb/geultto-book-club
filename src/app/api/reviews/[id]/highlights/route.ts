import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@supabase/server";
import { getSessionUser } from "@/lib/auth";
import { profileImagesByUserId } from "@/lib/profile-image";
import { summarizeReactions } from "@/lib/reactions";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const reviewId = (await ctx.params).id;
  const sessionUser = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  const { data: highlightRows } = await supabase
    .from("review_highlights")
    .select(
      `id, author_id, highlight_text, start_pos, end_pos,
       author:users!review_highlights_author_id_fkey(nickname),
       highlight_comments(
         id, body, author_id, created_at,
         author:users!highlight_comments_author_id_fkey(nickname),
         highlight_comment_reactions(emoji, user_id, user:users(nickname)),
         highlight_comment_replies(
           id, body, author_id, created_at,
           author:users!highlight_comment_replies_author_id_fkey(nickname)
         )
       )`,
    )
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  if (!highlightRows) return NextResponse.json([]);

  const authorIds = [
    ...new Set(
      [
        ...highlightRows.map((h) => h.author_id),
        ...highlightRows.flatMap((h) =>
          ((h.highlight_comments as unknown[]) ?? []).flatMap((c: unknown) => {
            const comment = c as {
              author_id?: string | null;
              highlight_comment_replies?: Array<{ author_id?: string | null }>;
            };
            return [
              comment.author_id,
              ...(comment.highlight_comment_replies ?? []).map(
                (r) => r.author_id,
              ),
            ];
          }),
        ),
      ].filter(Boolean),
    ),
  ] as string[];

  const { data: avatarRows } =
    authorIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id, profile_image_url, profile_decoration")
          .in("user_id", authorIds)
      : { data: [] };
  const profileImageMap = profileImagesByUserId(avatarRows);

  const highlights = highlightRows
    .filter((h) => h.start_pos != null && h.end_pos != null)
    .map((h) => ({
      id: h.id,
      authorId: h.author_id ?? "",
      highlightText: h.highlight_text,
      startPos: h.start_pos!,
      endPos: h.end_pos!,
      authorNickname:
        (h.author as { nickname: string } | null)?.nickname ?? "익명",
      authorImageUrl: h.author_id
        ? profileImageMap.get(h.author_id)?.profileImageUrl
        : null,
      authorDecoration: h.author_id
        ? profileImageMap.get(h.author_id)?.profileDecoration
        : null,
      comments: ((h.highlight_comments as unknown[]) ?? []).map(
        (c: unknown) => {
          const comment = c as {
            id: string;
            body: string;
            author_id: string | null;
            created_at: string | null;
            author: { nickname: string } | null;
            highlight_comment_reactions: Array<{
              emoji: string;
              user_id: string | null;
              user:
                | { nickname: string | null }
                | Array<{ nickname: string | null }>
                | null;
            }>;
            highlight_comment_replies: Array<{
              id: string;
              body: string;
              author_id: string | null;
              created_at: string | null;
              author:
                | { nickname: string }
                | Array<{ nickname: string }>
                | null;
            }>;
          };
          return {
            id: comment.id,
            body: comment.body,
            author: comment.author?.nickname ?? "익명",
            authorImageUrl: comment.author_id
              ? profileImageMap.get(comment.author_id)?.profileImageUrl
              : null,
            authorDecoration: comment.author_id
              ? profileImageMap.get(comment.author_id)?.profileDecoration
              : null,
            createdAt: comment.created_at,
            reactions: summarizeReactions(
              (comment.highlight_comment_reactions ?? []).map((r) => ({
                emoji: r.emoji,
                user_id: r.user_id,
                user: Array.isArray(r.user) ? r.user[0] : r.user,
              })),
              sessionUser?.id,
            ),
            replies: (comment.highlight_comment_replies ?? []).map((r) => {
              const author = Array.isArray(r.author) ? r.author[0] : r.author;
              return {
                id: r.id,
                body: r.body,
                author: author?.nickname ?? "익명",
                authorImageUrl: r.author_id
                  ? profileImageMap.get(r.author_id)?.profileImageUrl
                  : null,
                authorDecoration: r.author_id
                  ? profileImageMap.get(r.author_id)?.profileDecoration
                  : null,
                createdAt: r.created_at,
              };
            }),
          };
        },
      ),
    }));

  return NextResponse.json(highlights);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === "pending" || sessionUser.isDeactivated) {
    return NextResponse.json(
      { message: "승인된 회원만 작성할 수 있습니다." },
      { status: 403 }
    );
  }

  const reviewId = (await ctx.params).id;
  const body = await req.json();
  const { highlightText, startPos, endPos } = body as {
    highlightText: string;
    startPos: number;
    endPos: number;
  };

  const MAX_HIGHLIGHT_TEXT_LENGTH = 500;
  const trimmedHighlightText =
    typeof highlightText === "string" ? highlightText.trim() : "";

  if (highlightText == null || startPos == null || endPos == null) {
    return NextResponse.json(
      { message: "필수 값이 누락되었습니다." },
      { status: 400 }
    );
  }

  if (
    !trimmedHighlightText ||
    trimmedHighlightText.length > MAX_HIGHLIGHT_TEXT_LENGTH ||
    !Number.isInteger(startPos) ||
    !Number.isInteger(endPos) ||
    startPos <= 0 ||
    endPos <= 0 ||
    startPos >= endPos
  ) {
    return NextResponse.json(
      { message: "하이라이트 입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("review_highlights")
    .insert({
      review_id: reviewId,
      author_id: sessionUser.id,
      highlight_text: trimmedHighlightText,
      start_pos: startPos,
      end_pos: endPos,
    })
    .select(
      "id, highlight_text, start_pos, end_pos, author:users!review_highlights_author_id_fkey(nickname)"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { message: "하이라이트 저장 실패", error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: data.id,
    authorId: sessionUser.id,
    highlightText: data.highlight_text,
    startPos: data.start_pos,
    endPos: data.end_pos,
    authorNickname:
      (data.author as { nickname: string } | null)?.nickname ?? "익명",
    comments: [],
  });
}
