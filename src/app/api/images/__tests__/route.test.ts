import { beforeEach, describe, expect, it, vi } from "vitest";
import { Blob } from "node:buffer";
import { DELETE, POST } from "../route";
import { GET as cleanup } from "../cleanup/route";
import type { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  referenced: vi.fn(), user: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn(), signed: vi.fn(),
  drafts: new Map<string, Record<string, unknown>>(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@supabase/image-admin", () => ({
  createImageAdminClient: () => ({
    rpc: mocks.referenced,
    storage: {
      from: (bucket: string) => ({
        upload: (...args: unknown[]) => mocks.upload(bucket, ...args),
        download: mocks.download, remove: (...args: unknown[]) => mocks.remove(bucket, ...args),
        createSignedUploadUrl: mocks.signed,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
    from: () => {
      let operation = "select";
      let values: Record<string, unknown> = {};
      const filters: Array<[string, unknown]> = [];
      const query = {
        insert: (v: typeof values) => { operation = "insert"; values = v; return query; },
        upsert: (v: typeof values) => { operation = "upsert"; values = v; return query; },
        update: (v: typeof values) => { operation = "update"; values = v; return query; },
        delete: () => { operation = "delete"; return query; },
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        gt: () => query, lt: () => query, order: () => query, limit: () => query,
        select: () => query,
        maybeSingle: async () => execute(true),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(execute(false)).then(resolve),
      };
      const execute = (single: boolean) => {
        if (operation === "insert" || operation === "upsert") {
          const exists = mocks.drafts.has(values.id as string);
          if (exists && operation === "insert") return { error: new Error("duplicate") };
          if (!exists) mocks.drafts.set(values.id as string, { state: "uploading", ...values });
          return { error: null };
        }
        const found = [...mocks.drafts.values()].filter(row => filters.every(([key, value]) => row[key] === value));
        for (const row of found) {
          if (operation === "update") Object.assign(row, values);
          if (operation === "delete") mocks.drafts.delete(row.id as string);
        }
        return { data: single ? found[0] ?? null : found, error: null };
      };
      return query;
    },
  }),
}));
const id = "22222222-2222-4222-8222-222222222222";
const user = { id: "11111111-1111-4111-8111-111111111111", role: "member", isDeactivated: false };
const path = `${user.id}/${id}.png`;
const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const request = (body: unknown) => ({ json: async () => body }) as NextRequest;
const prepare = (size = png.length) => POST(request({ action: "prepare", id, type: "image/png", size }));
const finalize = () => POST(request({ action: "finalize", id }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.drafts.clear();
  mocks.referenced.mockResolvedValue({ data: true, error: null });
  mocks.user.mockResolvedValue(user);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.signed.mockResolvedValue({ data: { signedUrl: "https://private.test/upload" }, error: null });
  mocks.download.mockResolvedValue({ data: new Blob([png]), error: null });
});

describe("quarantined image upload API", () => {
  it.each([null, { ...user, role: "pending" }, { ...user, isDeactivated: true }])("rejects inactive users", async (session) => {
    mocks.user.mockResolvedValue(session);
    expect((await prepare()).status).toBe(403);
    expect((await DELETE(request({ id }))).status).toBe(403);
    expect(mocks.signed).not.toHaveBeenCalled();
  });
  it("only publishes a 5MB image after downloading and inspecting actual bytes", async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024); bytes.set(png);
    mocks.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
    expect((await prepare(bytes.length)).status).toBe(201);
    expect(mocks.upload).not.toHaveBeenCalled();
    const response = await finalize();
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ path });
    expect(mocks.upload).toHaveBeenCalledWith("content-images", path, expect.any(Blob), { contentType: "image/png", upsert: false });
  });
  it("rejects forged headers and cleans both buckets", async () => {
    await prepare();
    mocks.download.mockResolvedValue({ data: new Blob([new Uint8Array(12)]), error: null });
    expect((await finalize()).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith("content-images", [path]);
    expect(mocks.remove).toHaveBeenCalledWith("content-image-drafts", [path]);
  });
  it("rejects changed sizes and oversized preparation", async () => {
    expect((await prepare(5 * 1024 * 1024 + 1)).status).toBe(400);
    await prepare(13);
    expect((await finalize()).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("retains cancellation arriving before prepare as a tombstone", async () => {
    expect((await DELETE(request({ id }))).status).toBe(204);
    expect((await prepare()).status).toBe(400);
    expect((await finalize()).status).toBe(400);
    expect(mocks.signed).not.toHaveBeenCalled();
  });
  it("removes a published object if cancellation races with finalization", async () => {
    await prepare();
    mocks.upload.mockImplementationOnce(async () => {
      await DELETE(request({ id }));
      return { error: null };
    });
    expect((await finalize()).status).toBe(400);
    expect(mocks.drafts.get(id)?.state).toBe("cancelled");
    expect(mocks.remove).toHaveBeenCalledWith("content-images", [path]);
  });
  it("prevents finalization and cancellation of another owner's draft", async () => {
    await prepare();
    mocks.user.mockResolvedValue({ ...user, id: "33333333-3333-4333-8333-333333333333" });
    expect((await finalize()).status).toBe(400);
    expect((await DELETE(request({ id }))).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("retries failed deletion without losing the cancellation record", async () => {
    await prepare();
    mocks.remove.mockResolvedValueOnce({ error: new Error("offline") });
    expect((await DELETE(request({ id }))).status).toBe(400);
    expect(mocks.drafts.get(id)?.state).toBe("cancelled");
    expect((await DELETE(request({ id }))).status).toBe(204);
  });
  it("cleanup removes late private uploads but preserves ready public images", async () => {
    await prepare();
    mocks.drafts.get(id)!.state = "ready";
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect((await cleanup({ headers: new Headers() } as NextRequest)).status).toBe(401);
    const response = await cleanup({ headers: new Headers({ authorization: "Bearer test-secret" }) } as NextRequest);
    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith("content-image-drafts", [path]);
    expect(mocks.remove).not.toHaveBeenCalledWith("content-images", [path]);
    mocks.drafts.set(id, { id, path, state: "ready" });
    mocks.referenced.mockResolvedValue({ data: false, error: null });
    await cleanup({ headers: new Headers({ authorization: "Bearer test-secret" }) } as NextRequest);
    expect(mocks.remove).toHaveBeenCalledWith("content-images", [path]);
    vi.unstubAllEnvs();
  });
});
