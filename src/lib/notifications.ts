import type { Database } from "@supabase/types";
export type HighlightNotification =
  Database["public"]["Tables"]["highlight_notifications"]["Row"];
export function notificationText(notification: HighlightNotification) {
  const labels = {
    highlight: "내 독후감에 하이라이트를 남겼습니다",
    comment: "내 하이라이트에 댓글을 남겼습니다",
    reply: "내 하이라이트 댓글에 답글을 남겼습니다",
    highlight_reaction: "내 하이라이트에 반응했습니다",
    comment_reaction: "내 하이라이트 댓글에 반응했습니다",
  };
  return `${notification.actor_nickname} 님이 ${labels[notification.kind]}`;
}
export function notificationHref(notification: HighlightNotification) {
  if (
    !notification.review_id ||
    !notification.highlight_id ||
    (["comment", "reply", "comment_reaction"].includes(notification.kind) &&
      !notification.comment_id) ||
    (notification.kind === "reply" && !notification.reply_id)
  )
    return null;
  const query = new URLSearchParams({ highlight: notification.highlight_id });
  if (notification.comment_id) query.set("comment", notification.comment_id);
  if (notification.reply_id) query.set("reply", notification.reply_id);
  return `/reviews/${notification.review_id}?${query}`;
}
