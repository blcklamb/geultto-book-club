import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@supabase/types";

export type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByUser: boolean;
  nicknames: string[];
};

type ReactionTable = "quote_reactions" | "review_reactions";
type ReactionColumn = "quote_id" | "review_id";

type ReactionRow = {
  emoji: string;
  user_id: string | null;
  user?: {
    nickname: string | null;
  } | null;
};

export const sortReactions = (reactions: ReactionSummary[]) =>
  [...reactions].sort((a, b) => {
    if (b.count === a.count) {
      return a.emoji.localeCompare(b.emoji);
    }
    return b.count - a.count;
  });

export function summarizeReactions(
  rows: ReactionRow[],
  userId?: string | null
): ReactionSummary[] {
  const counts = new Map<string, number>();
  const names = new Map<string, Set<string>>();
  const userReactions = new Set(
    rows
      .filter((row) => row.user_id && row.user_id === userId)
      .map((row) => row.emoji)
  );

  rows.forEach((row) => {
    counts.set(row.emoji, (counts.get(row.emoji) ?? 0) + 1);
    const nickname = row.user?.nickname?.trim();
    if (nickname) {
      const set = names.get(row.emoji) ?? new Set<string>();
      set.add(nickname);
      names.set(row.emoji, set);
    }
  });

  return sortReactions(
    Array.from(counts.entries()).map(([emoji, count]) => ({
      emoji,
      count,
      reactedByUser: userReactions.has(emoji),
      nicknames: Array.from(names.get(emoji) ?? []),
    }))
  );
}

export async function fetchReactionSummary(
  supabase: SupabaseClient<Database>,
  table: ReactionTable,
  contentColumn: ReactionColumn,
  contentId: string,
  userId?: string | null
): Promise<ReactionSummary[]> {
  const { data, error } = await supabase
    .from(table)
    .select("emoji, user_id, user:users(nickname)")
    .eq(contentColumn, contentId);

  if (error) {
    throw new Error("이모지 반응을 불러오지 못했습니다.");
  }

  return summarizeReactions(data ?? [], userId);
}

export async function toggleReaction({
  supabase,
  table,
  contentColumn,
  contentId,
  userId,
  emoji,
}: {
  supabase: SupabaseClient<Database>;
  table: ReactionTable;
  contentColumn: ReactionColumn;
  contentId: string;
  userId: string;
  emoji: string;
}) {
  const { data: existing, error: loadError } = await supabase
    .from(table)
    .select("id")
    .eq(contentColumn, contentId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (loadError) {
    throw new Error("반응 상태를 확인하지 못했습니다.");
  }

  if (existing) {
    const { error } = await supabase.from(table).delete().eq("id", existing.id);
    if (error) {
      throw new Error("반응을 취소하지 못했습니다.");
    }
    return;
  }

  const { error } = await supabase.from(table).insert({
    [contentColumn]: contentId,
    user_id: userId,
    emoji,
  } as Database["public"]["Tables"][typeof table]["Insert"]);

  if (error) {
    throw new Error("반응을 저장하지 못했습니다.");
  }
}
