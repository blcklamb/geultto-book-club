import { beforeEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
import { DELETE, POST } from "../route";
import type { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/${path}` },
        }),
      }),
    },
  }),
}));
const png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0];
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "member",
  isDeactivated: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(user);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});

async function postFile(
  type = "image/png",
  bytes = new Uint8Array(png),
) {
  const old = globalThis.File;
  Object.defineProperty(globalThis, "File", {
    value: NodeFile,
    configurable: true,
  });
  try {
    const file = new NodeFile([bytes], "test.png", { type });
    const req = {
      formData: async () => ({ get: () => file }),
    } as unknown as NextRequest;
    return await POST(req);
  } finally {
    Object.defineProperty(globalThis, "File", {
      value: old,
      configurable: true,
    });
  }
}
describe("image upload API", () => {
  it.each([
    null,
    { ...user, role: "pending" },
    { ...user, isDeactivated: true },
  ])("requires an approved active member", async (session) => {
    mocks.user.mockResolvedValue(session);
    expect((await POST({} as NextRequest)).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("inspects and stores a 5MB image in the authenticated user's directory", async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024);
    bytes.set(png);
    const response = await postFile("image/png", bytes);
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.path).toMatch(new RegExp(`^${user.id}/.*\\.png$`));
    expect(mocks.upload).toHaveBeenCalled();
  });
  it("rejects oversized images, unsupported formats and mismatched bytes", async () => {
    const tooLarge = new Uint8Array(5 * 1024 * 1024 + 1);
    tooLarge.set(png);
    for (const response of [
      await postFile("image/png", tooLarge),
      await postFile("image/svg+xml"),
      await postFile("image/jpeg"),
      await postFile("image/png", new Uint8Array([0, 1])),
    ])
      expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("does not trust JSON metadata or leave deletion unauthenticated", async () => {
    const claimed = {
      formData: async () => {
        throw new Error("multipart required");
      },
    } as unknown as NextRequest;
    expect((await POST(claimed)).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    const path = `${user.id}/22222222-2222-4222-8222-222222222222.png`;
    const req = { json: async () => ({ path }) } as NextRequest;
    expect((await DELETE(req)).status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith([path]);
  });
});
