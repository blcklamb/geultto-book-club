import { describe, expect, it } from "vitest";
import { awardPointTransaction } from "../points";

class AwaitableQuery<T> {
  constructor(private readonly value: T) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.value);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.value).then(onfulfilled, onrejected);
  }
}

function makeSupabaseMock({
  user = { data: { id: "user-1", is_deactivated: false } },
  schedule = { data: { cohort: 5 }, error: null },
  count = { count: 0, error: null },
  insert = { error: null },
}: {
  user?: { data: { id: string; is_deactivated: boolean } | null };
  schedule?: { data: { cohort: number | null } | null; error: { message: string } | null };
  count?: { count: number | null; error: { message: string } | null };
  insert?: { error: { code?: string; message: string } | null };
} = {}) {
  return {
    from(table: string) {
      if (table === "users") {
        return new AwaitableQuery(user);
      }
      if (table === "schedules") {
        return new AwaitableQuery(schedule);
      }

      return {
        select() {
          return new AwaitableQuery(count);
        },
        insert() {
          return Promise.resolve(insert);
        },
      };
    },
  };
}

describe("awardPointTransaction", () => {
  it("skips deactivated users", async () => {
    const supabase = makeSupabaseMock({
      user: { data: { id: "user-1", is_deactivated: true } },
    });

    const result = await awardPointTransaction(supabase as never, {
      userId: "user-1",
      sourceType: "quote_submission",
      points: 1,
      idempotencyKey: "quote_submission:quote-1",
    });

    expect(result).toEqual({ awarded: false, reason: "inactive-user" });
  });

  it("skips when the schedule cap is reached", async () => {
    const supabase = makeSupabaseMock({ count: { count: 5, error: null } });

    const result = await awardPointTransaction(supabase as never, {
      userId: "user-1",
      scheduleId: "schedule-1",
      sourceType: "quote_submission",
      points: 1,
      idempotencyKey: "quote_submission:quote-1",
      cap: { scheduleId: "schedule-1", limit: 5 },
    });

    expect(result).toEqual({ awarded: false, reason: "cap-reached" });
  });

  it("treats unique constraint errors as duplicate awards", async () => {
    const supabase = makeSupabaseMock({
      insert: { error: { code: "23505", message: "duplicate key" } },
    });

    const result = await awardPointTransaction(supabase as never, {
      userId: "user-1",
      sourceType: "quote_submission",
      points: 1,
      idempotencyKey: "quote_submission:quote-1",
    });

    expect(result).toEqual({ awarded: false, reason: "duplicate" });
  });
});
