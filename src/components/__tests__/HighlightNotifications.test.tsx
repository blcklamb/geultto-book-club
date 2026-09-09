import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { HighlightNotifications } from "../HighlightNotifications";
import {
  notificationHref,
  type HighlightNotification,
} from "@/lib/notifications";
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), info: vi.fn() }),
  on: vi.fn(),
  subscribe: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@supabase/client", () => ({
  createClient: () => ({
    channel: () => ({ on: mocks.on }),
    removeChannel: mocks.remove,
  }),
}));
const item: HighlightNotification = {
  id: "notice-1",
  recipient_id: "me",
  actor_id: "other",
  actor_nickname: "다른 회원",
  kind: "reply",
  review_id: "review",
  highlight_id: "highlight",
  comment_id: "comment",
  reply_id: "reply",
  excerpt: "새 답글",
  source_id: "reply",
  source_table: "highlight_comment_replies",
  created_at: "2026-09-07T01:00:00Z",
  read_at: null,
};
let eventCallback: (payload: {
  eventType: string;
  new: HighlightNotification;
}) => void;
let subscribed: (status: string) => void;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.on.mockImplementation((_event, _filter, callback) => {
    eventCallback = callback;
    return { subscribe: mocks.subscribe };
  });
  mocks.subscribe.mockImplementation((callback) => {
    subscribed = callback;
    return {};
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          notifications: [item],
          unreadCount: 1,
          hasMore: false,
        }),
      }),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("saved highlight notifications", () => {
  it("loads offline notifications without replaying toasts", async () => {
    render(<HighlightNotifications userId="me" />);
    expect(
      await screen.findByLabelText("읽지 않은 알림 1개"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /알림/ }));
    expect(await screen.findByText("새 답글")).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
  it("shows an eligible realtime insert once, skips self and read updates, and refreshes on reconnect", async () => {
    const { unmount } = render(<HighlightNotifications userId="me" />);
    await screen.findByLabelText("읽지 않은 알림 1개");
    await act(async () => {
      eventCallback({ eventType: "INSERT", new: item });
      eventCallback({ eventType: "INSERT", new: item });
      eventCallback({
        eventType: "UPDATE",
        new: { ...item, read_at: item.created_at },
      });
      eventCallback({
        eventType: "INSERT",
        new: { ...item, id: "own", actor_id: "me" },
      });
    });
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    const before = vi.mocked(fetch).mock.calls.length;
    await act(async () => subscribed("SUBSCRIBED"));
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(before);
    unmount();
    expect(mocks.remove).toHaveBeenCalled();
  });
  it("marks an item read and opens its exact highlight reply", async () => {
    render(<HighlightNotifications userId="me" />);
    await screen.findByLabelText("읽지 않은 알림 1개");
    fireEvent.click(screen.getByRole("button", { name: /알림/ }));
    fireEvent.click(await screen.findByText("새 답글"));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/reviews/review?highlight=highlight&comment=comment&reply=reply",
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/notifications",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ ids: [item.id] }),
      }),
    );
  });
  it("does not navigate to a deleted target", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [{ ...item, comment_id: null }],
        unreadCount: 1,
        hasMore: false,
      }),
    } as Response);
    render(<HighlightNotifications userId="me" />);
    await screen.findByLabelText("읽지 않은 알림 1개");
    fireEvent.click(screen.getByRole("button", { name: /알림/ }));
    fireEvent.click(await screen.findByText("새 답글"));
    await waitFor(() => expect(mocks.toast.info).toHaveBeenCalled());
    expect(mocks.push).not.toHaveBeenCalled();
    expect(notificationHref({ ...item, review_id: null })).toBeNull();
  });
  it("marks all notifications through the displayed snapshot read", async () => {
    render(<HighlightNotifications userId="me" />);
    await screen.findByLabelText("읽지 않은 알림 1개");
    fireEvent.click(screen.getByRole("button", { name: /알림/ }));
    fireEvent.click(await screen.findByRole("button", { name: "모두 읽음" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/notifications",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ before: item.created_at }),
        }),
      ),
    );
  });
});
