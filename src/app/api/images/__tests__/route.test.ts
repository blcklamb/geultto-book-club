import { beforeEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
import { POST } from "../route";
import type { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  upload: vi.fn(),
  signed: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUploadUrl: mocks.signed,
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
  mocks.signed.mockResolvedValue({
    data: { signedUrl: "https://storage.test/signed" },
    error: null,
  });
});
function metadata(type = "image/png", size = 5 * 1024 * 1024, signature = png) {
  return {
    headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => ({ type, size, signature }),
  } as NextRequest;
}
describe("image upload API", () => {
  it.each([
    null,
    { ...user, role: "pending" },
    { ...user, isDeactivated: true },
  ])("requires an approved active member", async (session) => {
    mocks.user.mockResolvedValue(session);
    expect((await POST(metadata())).status).toBe(403);
    expect(mocks.signed).not.toHaveBeenCalled();
  });
  it("creates a signed upload for a 5MB image in the authenticated user's directory", async () => {
    const response = await POST(metadata());
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.path).toMatch(new RegExp(`^${user.id}/.*\\.png$`));
    expect(data.uploadUrl).toBe("https://storage.test/signed");
  });
  it("rejects oversized images, unsupported formats and mismatched signatures", async () => {
    for (const req of [
      metadata("image/png", 5 * 1024 * 1024 + 1),
      metadata("image/svg+xml"),
      metadata("image/jpeg"),
      metadata("image/png", -1),
      metadata("image/png", 1, [0, 1]),
    ])
      expect((await POST(req)).status).toBe(400);
    expect(mocks.signed).not.toHaveBeenCalled();
  });
  it("uploads smaller multipart files after inspecting their header", async () => {
    // Route handlers use Node's File, unlike jsdom's legacy File implementation.
    const old = globalThis.File;
    Object.defineProperty(globalThis, "File", {
      value: NodeFile,
      configurable: true,
    });
    try {
      const file = new NodeFile([new Uint8Array(png)], "test.png", {
        type: "image/png",
      });
      const req = {
        headers: new Headers(),
        formData: async () => ({ get: () => file }),
      } as unknown as NextRequest;
      expect((await POST(req)).status).toBe(201);
      expect(mocks.upload).toHaveBeenCalled();
      mocks.upload.mockResolvedValue({ error: { message: "network" } });
      expect((await POST(req)).status).toBe(500);
    } finally {
      Object.defineProperty(globalThis, "File", {
        value: old,
        configurable: true,
      });
    }
  });
});
