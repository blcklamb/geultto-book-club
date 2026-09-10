import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageUploads } from "../useImageUploads";

const upload = () => new File(["png"], "image.png", { type: "image/png" });
const response = (ok: boolean, body = {}) => ({
  ok,
  json: async () => body,
}) as Response;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe("removing failed image uploads", () => {
  it("removes a failed preparation even when server cancellation also fails", async () => {
    vi.mocked(fetch).mockImplementation(async (_url, options) =>
      response(false, {
        message: options?.method === "DELETE"
          ? "업로드 취소에 실패했습니다."
          : "이미지 저장소 서버 설정이 필요합니다.",
      }),
    );
    const onRemoved = vi.fn();
    const { result } = renderHook(() => useImageUploads({ onRemoved }));
    act(() => { result.current.add([upload()]); });
    await waitFor(() => expect(result.current.items[0].status).toBe("error"));

    await act(() => result.current.remove(result.current.items[0].id));

    expect(result.current.items).toEqual([]);
    expect(result.current.isBlocked()).toBe(false);
    expect(onRemoved).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  });

  it("removes a pending preparation without waiting for unavailable cleanup", async () => {
    let finishPreparation!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation((_url, options) =>
      options?.method === "DELETE"
        ? Promise.reject(new Error("offline"))
        : new Promise((resolve) => { finishPreparation = resolve; }),
    );
    const onUploaded = vi.fn();
    const { result } = renderHook(() => useImageUploads({ onUploaded }));
    act(() => { result.current.add([upload()]); });

    await act(() => result.current.remove(result.current.items[0].id));
    expect(result.current.items).toEqual([]);

    await act(async () => {
      finishPreparation(response(true, { uploadUrl: "https://storage.test/upload" }));
    });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  });

  it("requires successful cleanup after a storage upload has started, and allows retry", async () => {
    let cancellationSucceeds = false;
    vi.mocked(fetch).mockImplementation(async (_url, options) => {
      if (options?.method === "DELETE")
        return response(cancellationSucceeds, { message: "업로드 취소에 실패했습니다." });
      if (options?.method === "PUT") throw new Error("connection lost after sending bytes");
      return response(true, { uploadUrl: "https://storage.test/upload" });
    });
    const onRemoved = vi.fn();
    const { result } = renderHook(() => useImageUploads({ onRemoved }));
    act(() => { result.current.add([upload()]); });
    await waitFor(() => expect(result.current.items[0].status).toBe("error"));

    await act(() => result.current.remove(result.current.items[0].id));
    expect(result.current.items[0]).toMatchObject({ removalFailed: true });
    expect(result.current.isBlocked()).toBe(true);
    expect(onRemoved).not.toHaveBeenCalled();

    cancellationSucceeds = true;
    await act(() => result.current.remove(result.current.items[0].id));
    expect(result.current.items).toEqual([]);
    expect(onRemoved).toHaveBeenCalledOnce();
  });

  it("resets the transfer flag when a retry fails before uploading any new bytes", async () => {
    vi.mocked(fetch).mockImplementation(async (_url, options) => {
      if (options?.method === "DELETE") return response(true);
      if (options?.method === "PUT") throw new Error("offline");
      return response(true, { uploadUrl: "https://storage.test/upload" });
    });
    const { result } = renderHook(() => useImageUploads());
    act(() => { result.current.add([upload()]); });
    await waitFor(() => expect(result.current.items[0].status).toBe("error"));

    vi.mocked(fetch).mockResolvedValue(response(false, { message: "서버 오류" }));
    await act(() => result.current.retry(result.current.items[0]));
    await act(() => result.current.remove(result.current.items[0].id));

    expect(result.current.items).toEqual([]);
    expect(result.current.isBlocked()).toBe(false);
  });
});
