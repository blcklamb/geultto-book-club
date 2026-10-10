import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHighlightRefresh } from "../highlight-refresh";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

describe("highlight refresh scheduling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("merges realtime, panel and reconnect bursts in a 150ms window", async () => {
    const fetch = vi.fn().mockResolvedValue(["snapshot"]);
    const apply = vi.fn();
    const manager = createHighlightRefresh({ fetch, apply });
    for (let n = 0; n < 8; n++) manager.request();
    await vi.advanceTimersByTimeAsync(149);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(["snapshot"]);
    manager.stop();
  });
  it("runs only one follow-up after events arrive during a pending request", async () => {
    const first = deferred<string>();
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue("latest");
    const manager = createHighlightRefresh({ fetch, apply: vi.fn() });
    manager.request();
    await vi.advanceTimersByTimeAsync(150);
    for (let n = 0; n < 20; n++) manager.request();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    first.resolve("old");
    await vi.advanceTimersByTimeAsync(150);
    expect(fetch).toHaveBeenCalledTimes(2);
    manager.stop();
  });
  it("does not overwrite a successful local mutation with an earlier GET", async () => {
    const pending = deferred<string>();
    const apply = vi.fn();
    const fetch = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue("new");
    const manager = createHighlightRefresh({ fetch, apply });
    manager.request();
    await vi.advanceTimersByTimeAsync(150);
    manager.invalidate();
    manager.request();
    pending.resolve("old");
    await vi.advanceTimersByTimeAsync(150);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("new");
    manager.stop();
  });
  it("aborts on unmount and ignores a fetch that resolves after cancellation", async () => {
    const pending = deferred<string>();
    const apply = vi.fn();
    let signal!: AbortSignal;
    const manager = createHighlightRefresh({ fetch: s => { signal = s; return pending.promise; }, apply });
    manager.request();
    await vi.advanceTimersByTimeAsync(150);
    manager.request();
    manager.stop();
    expect(signal.aborted).toBe(true);
    pending.resolve("late");
    await vi.runAllTimersAsync();
    expect(apply).not.toHaveBeenCalled();
  });
  it("keeps the snapshot on failure and allows a reconnect to retry", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("reconnected");
    const apply = vi.fn();
    const manager = createHighlightRefresh({ fetch, apply });
    manager.request();
    await vi.advanceTimersByTimeAsync(150);
    expect(apply).not.toHaveBeenCalled();
    manager.request();
    await vi.advanceTimersByTimeAsync(150);
    expect(apply).toHaveBeenCalledWith("reconnected");
    manager.stop();
  });
  it("cancels the debounce timer before any GET starts", async () => {
    const fetch = vi.fn();
    const manager = createHighlightRefresh({ fetch, apply: vi.fn() });
    manager.request();
    manager.stop();
    await vi.runAllTimersAsync();
    expect(fetch).not.toHaveBeenCalled();
  });
});
