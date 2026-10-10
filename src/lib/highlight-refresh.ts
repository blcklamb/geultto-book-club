/** Coalesce all sources of invalidation; never run two GETs concurrently. */
export function createHighlightRefresh<T>(options: {
  fetch: (signal: AbortSignal) => Promise<T>;
  apply: (value: T) => void;
  delay?: number;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let dirty = false;
  let stopped = false;
  let generation = 0;
  const run = async () => {
    timer = undefined;
    if (stopped) return;
    dirty = false;
    const ticket = generation;
    const request = new AbortController();
    controller = request;
    try {
      const value = await options.fetch(request.signal);
      if (!stopped && ticket === generation) options.apply(value);
    } catch {
      // Preserve the last known snapshot. A later event/reconnect retries.
    } finally {
      controller = undefined;
      if (!stopped && dirty) schedule();
    }
  };
  const schedule = () => {
    if (stopped) return;
    if (controller) { dirty = true; return; }
    if (!timer) timer = setTimeout(() => { void run(); }, options.delay ?? 150);
  };
  return {
    request: schedule,
    invalidate: () => { generation++; },
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    },
  };
}
