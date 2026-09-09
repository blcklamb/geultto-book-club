import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "../route";
import libraryReview from "@/lib/__tests__/fixtures/bareun-library-review.json";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), review: vi.fn(), reserve: vi.fn(), release: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: (table: string) => {
      if (table === "reviews") {
        return { select: () => ({ eq: () => ({ maybeSingle: mocks.review }) }) };
      }
      return {
        insert: mocks.reserve,
        delete: () => ({ eq: (column: string, value: string) => ({
          eq: (secondColumn: string, secondValue: string) =>
            mocks.release({ [column]: value, [secondColumn]: secondValue }),
        }) }),
      };
    },
  }),
}));

const userId = "11111111-1111-4111-8111-111111111111";
const reviewId = "22222222-2222-4222-8222-222222222222";
const request = () => ({ json: async () => ({
  reviewId, segments: [{ id: "block-0", text: libraryReview.source }],
}) }) as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("BAREUN_API_KEY", "test-key");
  vi.stubEnv("SPELLCHECK_UNLIMITED_USER_IDS", "");
  mocks.user.mockResolvedValue({ id: userId, role: "member", isDeactivated: false });
  mocks.review.mockResolvedValue({ data: { author_id: userId }, error: null });
  mocks.reserve.mockResolvedValue({ error: null });
  mocks.release.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("spellcheck provider response handling", () => {
  it("returns corrections from the captured camelCase response instead of an empty list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(libraryReview.response));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request());
    expect(response.status).toBe(200);
    const { issues } = await response.json();
    expect(issues).toHaveLength(10);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ original: "됬고,", suggestion: "됐고," }),
      expect.objectContaining({ original: "금새", suggestion: "금세" }),
    ]));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.encoding_type).toBe("UTF16");
    expect(body.document.content).toBe(libraryReview.source);
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it.each([{}, { revisedBlocks: {} }, { revisedBlocks: [{ origin: { content: "wrong", beginOffset: 0 }, revised: "right" }] }])(
    "reports malformed results as errors and releases the usage reservation: %j", async (body) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
      const response = await POST(request());
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "맞춤법 검사 결과를 읽지 못했습니다. 다시 시도해주세요." });
      expect(mocks.release).toHaveBeenCalledWith({ review_id: reviewId, user_id: userId });
    },
  );

  it("returns no issues when the provider explicitly returns unchanged text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      origin: libraryReview.source, revised: libraryReview.source, revisedBlocks: [],
    })));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ issues: [] });
    expect(mocks.release).not.toHaveBeenCalled();
  });
});
