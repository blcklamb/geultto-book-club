import { describe, it, expect, vi, beforeEach } from "vitest";
import HomePage from "@/app/(public)/page";

const mock = vi.hoisted(() => ({ user: null as null | { id: string }, started: [] as string[], resolve: {} as Record<string, (value: unknown) => void>, filters: [] as unknown[][] }));
vi.mock("@/lib/auth", () => ({ getSessionUser: async () => mock.user }));
vi.mock("@supabase/server", () => ({ createSupabaseServerClient: async () => ({
  from: (table: string) => {
    const query = {
      select: () => query, gte: () => query, order: () => query,
      eq: (column: string, value: string) => { mock.filters.push([table, column, value]); return query; },
      limit: () => query, maybeSingle: () => query,
      then: (resolve: (value: unknown) => void) => {
        mock.started.push(table);
        mock.resolve[table] = resolve;
      },
    };
    return query;
  },
}) }));
vi.mock("@/components/HomeScene3DLazy", () => ({ HomeScene3DLazy: () => null }));
vi.mock("@/components/ScheduleDate", () => ({ ScheduleDate: () => null }));
vi.mock("@/components/LocalizedDate", () => ({ LocalizedDate: () => null }));
vi.mock("@/features/summer-palette/components/SummerPaletteViewerCard", () => ({ SummerPaletteViewerCard: () => null }));

describe("home query concurrency", () => {
  beforeEach(() => { mock.started = []; mock.resolve = {}; mock.filters = []; });
  it("starts all four member queries before any response and retains user filters", async () => {
    mock.user = { id: "member1" };
    const page = HomePage();
    // Both session lookups complete, then Promise.all starts all thenables.
    for (let n = 0; n < 5; n++) await Promise.resolve();
    expect(mock.started).toEqual(["schedules", "reviews", "topics", "summer_palette_boards"]);
    expect(mock.filters).toEqual([
      ["reviews", "author_id", "member1"], ["topics", "author_id", "member1"], ["summer_palette_boards", "user_id", "member1"],
    ]);
    for (const table of mock.started) mock.resolve[table]({ data: table === "summer_palette_boards" ? null : [] });
    expect(await page).toBeTruthy();
  });
  it("only queries schedules when signed out", async () => {
    mock.user = null;
    const page = HomePage();
    for (let n = 0; n < 5; n++) await Promise.resolve();
    expect(mock.started).toEqual(["schedules"]);
    mock.resolve.schedules({ data: [] });
    expect(await page).toBeTruthy();
    expect(mock.filters).toEqual([]);
  });
});
