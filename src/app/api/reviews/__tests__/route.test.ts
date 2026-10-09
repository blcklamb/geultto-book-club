import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { MIN_RICH_TEXT_CHARS, richTextMinCharsMessage } from "@/lib/rich-text";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), insert: vi.fn(), review: vi.fn(), schedule: vi.fn(), points: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@/lib/points", () => ({ awardReviewSubmissionPoints: mocks.points }));
vi.mock("@supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: (table: string) => table === "reviews"
      ? { insert: mocks.insert }
      : { select: () => ({ eq: () => ({ single: mocks.schedule }) }) },
  }),
}));

const user = { id: "11111111-1111-4111-8111-111111111111", role: "member", isDeactivated: false };
const reviewId = "22222222-2222-4222-8222-222222222222";
const scheduleId = "33333333-3333-4333-8333-333333333333";

function request(content: unknown, overrides: Record<string, string> = {}) {
  const body = new FormData();
  const fields = { scheduleId, reviewId, title: "독후감 QA", contentRich: JSON.stringify(content), ...overrides };
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  return new NextRequest("http://localhost/api/reviews", { method: "POST", body });
}

function document(length: number) {
  return { type: "doc", content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "가".repeat(250) }] },
    { type: "paragraph", content: [
      { type: "text", text: "나".repeat(length - 253), marks: [{ type: "bold" }] },
      { type: "hardBreak" },
    ] },
  ] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(user);
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.review }) });
  mocks.review.mockResolvedValue({ data: { id: reviewId, created_at: "2026-10-09T00:00:00Z" }, error: null });
  mocks.schedule.mockResolvedValue({ data: { date: "2026-10-10T00:00:00Z" }, error: null });
});

describe("review submission validation", () => {
  it.each([500, 501])("saves %i plain text characters with formatting and line breaks", async (length) => {
    const content = document(length);
    const response = await POST(request(content));
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/reviews");
    expect(location.searchParams.get("success")).toBe("독후감이 등록되었습니다.");
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({
      id: reviewId, author_id: user.id, schedule_id: scheduleId, content_rich: JSON.stringify(content),
    })]);
    expect(mocks.points).toHaveBeenCalledOnce();
  });

  it("rejects 499 plain text characters including paragraph and hard breaks", async () => {
    const response = await POST(request(document(MIN_RICH_TEXT_CHARS - 1)));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/reviews/new");
    expect(location.searchParams.get("error")).toBe(richTextMinCharsMessage("독후감", 499));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.points).not.toHaveBeenCalled();
  });

  it("rejects malformed serialized content", async () => {
    const response = await POST(request(document(500), { contentRich: "{broken" }));
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("본문 형식이 올바르지 않습니다.");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("still rejects external images", async () => {
    const content = document(500);
    const response = await POST(request({ ...content, content: [...content.content,
      { type: "image", attrs: { src: "https://example.test/image.png" } },
    ] }));
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("본문 형식이 올바르지 않습니다.");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each([null, { ...user, role: "pending" }, { ...user, isDeactivated: true }])("rejects unauthorized users: %j", async (session) => {
    mocks.user.mockResolvedValue(session);
    const response = await POST(request(document(500)));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/pending");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
