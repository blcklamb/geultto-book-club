"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/client";
import {
  notificationHref,
  notificationText,
  type HighlightNotification,
} from "@/lib/notifications";
import { Button } from "./ui/button";
import { LocalizedDate } from "./LocalizedDate";

type NotificationPage = {
  notifications: HighlightNotification[];
  unreadCount: number;
  hasMore: boolean;
};
export function HighlightNotifications({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HighlightNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seen = useRef(new Set<string>());
  const generation = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("알림을 불러오지 못했습니다.");
      const data: NotificationPage = await res.json();
      if (ticket !== generation.current) return;
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setError(null);
    } catch (e) {
      if (ticket === generation.current)
        setError(e instanceof Error ? e.message : "알림 조회 실패");
    }
  }, []);
  const markRead = async (body: { ids: string[] } | { before: string }) => {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("알림을 읽음 처리하지 못했습니다.");
    await refresh();
  };
  const visit = async (item: HighlightNotification) => {
    try {
      const res = await fetch(
        `/api/notifications?id=${encodeURIComponent(item.id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("알림 대상을 확인하지 못했습니다.");
      const data: NotificationPage = await res.json();
      const current = data.notifications[0];
      const href = current ? notificationHref(current) : null;
      await markRead({ ids: [item.id] });
      if (!href) {
        toast.info("삭제된 하이라이트 또는 댓글입니다.");
        return;
      }
      setOpen(false);
      router.push(href);
      // Also opens the target when the URL is already the current URL.
      window.dispatchEvent(
        new CustomEvent("open-highlight-notification", {
          detail: {
            reviewId: current.review_id,
            highlightId: current.highlight_id,
            commentId: current.comment_id,
            replyId: current.reply_id,
          },
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "알림 이동 실패");
    }
  };
  const visitRef = useRef(visit);
  visitRef.current = visit;
  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`highlight-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "highlight_notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const item = payload.new as HighlightNotification;
          if (
            payload.eventType === "INSERT" &&
            item.recipient_id === userId &&
            item.actor_id !== userId &&
            !seen.current.has(item.id)
          ) {
            seen.current.add(item.id);
            toast(notificationText(item), {
              id: item.id,
              description: item.excerpt,
              action: {
                label: "보기",
                onClick: () => void visitRef.current(item),
              },
            });
          }
          void refresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    // Recover missed events even when a websocket connection fails silently.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    return () => {
      generation.current++;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      window.clearInterval(timer);
    };
  }, [supabase, userId, refresh]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div ref={root} className="relative mb-4 flex justify-end">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls="highlight-notifications"
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        <Bell className="mr-2 h-4 w-4" />
        알림{" "}
        {unreadCount > 0 && (
          <span
            aria-label={`읽지 않은 알림 ${unreadCount}개`}
            className="ml-2 rounded-full bg-rose-600 px-2 text-white"
          >
            {unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <section
          id="highlight-notifications"
          aria-label="하이라이트 알림"
          className="absolute right-0 top-11 z-40 max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border bg-white p-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">하이라이트 알림</h2>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!unreadCount || !items.length}
              onClick={() =>
                void markRead({ before: items[0].created_at }).catch((e) =>
                  toast.error(e.message),
                )
              }
            >
              모두 읽음
            </Button>
          </div>
          {error && (
            <div role="alert" className="py-3 text-sm">
              {error}
              <Button
                type="button"
                variant="ghost"
                onClick={() => void refresh()}
              >
                재시도
              </Button>
            </div>
          )}
          {!error && items.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              아직 알림이 없습니다.
            </p>
          )}
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`my-1 block w-full rounded p-3 text-left text-sm hover:bg-slate-100 ${item.read_at ? "text-slate-500" : "bg-sky-50"}`}
              onClick={() => void visit(item)}
            >
              <span>
                {!item.read_at && (
                  <span className="mr-1 text-sky-600" aria-label="읽지 않음">
                    ●
                  </span>
                )}
                {notificationText(item)}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {item.excerpt}
              </span>
              <span className="block text-xs text-slate-400">
                <LocalizedDate
                  value={item.created_at}
                  options={{ dateStyle: "short", timeStyle: "short" }}
                />
              </span>
              {!notificationHref(item) && (
                <span className="text-xs">삭제된 대상</span>
              )}
            </button>
          ))}
          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const ticket = generation.current;
                try {
                  const res = await fetch(
                    `/api/notifications?offset=${items.length}`,
                    { cache: "no-store" },
                  );
                  if (!res.ok) throw new Error("알림 조회 실패");
                  const data: NotificationPage = await res.json();
                  if (ticket === generation.current) {
                    setItems((prev) => [
                      ...prev,
                      ...data.notifications.filter(
                        (n) => !prev.some((p) => p.id === n.id),
                      ),
                    ]);
                    setHasMore(data.hasMore);
                  }
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "알림 조회 실패",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              이전 알림 더 보기
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
