import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CommentThread } from "../CommentThread";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const userId = "11111111-1111-4111-8111-111111111111";
const path = `${userId}/22222222-2222-4222-8222-222222222222.png`;
const upload = () => new File(["png"], "image.png", { type: "image/png" });
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ path, url: "https://example.test/image.png", uploadUrl: "https://storage.test/private-upload" }),
      }),
  );
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());
describe("comment image attachments", () => {
  it.each(["file", "paste", "drop"])(
    "uploads via %s and submits an image-only comment",
    async (method) => {
      const submit = vi.fn().mockResolvedValue(undefined);
      render(<CommentThread comments={[]} submitAction={submit} />);
      const file = upload();
      if (method === "file")
        fireEvent.change(screen.getByLabelText("첨부할 이미지 선택"), {
          target: { files: [file] },
        });
      else if (method === "paste")
        fireEvent.paste(screen.getByPlaceholderText("느낀 점을 남겨보세요"), {
          clipboardData: { files: [file] },
        });
      else
        fireEvent.drop(screen.getByPlaceholderText("느낀 점을 남겨보세요"), {
          dataTransfer: { files: [file] },
        });
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "댓글 등록" })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole("button", { name: "댓글 등록" }));
      await waitFor(() => expect(submit).toHaveBeenCalledWith("", [path]));
      expect(screen.queryByAltText("image.png")).toBeNull();
    },
  );
  it("uploads a 5MB file to private storage and finalizes it on the server", async () => {
    render(<CommentThread comments={[]} submitAction={vi.fn()} />);
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "large.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("첨부할 이미지 선택"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "댓글 등록" })).toBeEnabled());
    expect(fetch).toHaveBeenCalledWith("https://storage.test/private-upload", expect.objectContaining({ method: "PUT", body: file }));
    expect(fetch).toHaveBeenCalledWith("/api/images", expect.objectContaining({
      method: "POST", body: expect.stringContaining('"action":"finalize"'),
    }));
  });
  it("cancels by upload ID on unmount before receiving the upload response", async () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = render(<CommentThread comments={[]} submitAction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("첨부할 이미지 선택"), { target: { files: [upload()] } });
    unmount();
    expect(fetch).toHaveBeenCalledWith("/api/images", expect.objectContaining({
      method: "DELETE", keepalive: true, body: expect.stringContaining('"id":'),
    }));
  });
  it("keeps text on failure, blocks submit, retries and allows removing an attachment", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "서버 오류" }),
    } as Response);
    const submit = vi.fn();
    render(<CommentThread comments={[]} submitAction={submit} />);
    fireEvent.change(screen.getByPlaceholderText("느낀 점을 남겨보세요"), {
      target: { value: "보존할 내용" },
    });
    fireEvent.change(screen.getByLabelText("첨부할 이미지 선택"), {
      target: { files: [upload()] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("서버 오류");
    expect(screen.getByRole("button", { name: "댓글 등록" })).toBeDisabled();
    expect(screen.getByPlaceholderText("느낀 점을 남겨보세요")).toHaveValue(
      "보존할 내용",
    );
    fireEvent.click(screen.getByRole("button", { name: "재시도" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "댓글 등록" })).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "image.png 첨부 제거" }),
    );
    await waitFor(() => expect(screen.queryByAltText("image.png")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "댓글 등록" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith("보존할 내용", []));
  });
  it("does not submit or resurrect an upload removed while its request is pending", async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const submit = vi.fn();
    render(<CommentThread comments={[]} submitAction={submit} />);
    fireEvent.change(screen.getByLabelText("첨부할 이미지 선택"), {
      target: { files: [upload()] },
    });
    expect(screen.getByRole("button", { name: "댓글 등록" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "image.png 첨부 제거" }),
    );
    await act(async () =>
      resolve({
        ok: true,
        json: async () => ({ path, url: "https://example.test/image.png", uploadUrl: "https://storage.test/private-upload" }),
      } as Response),
    );
    expect(screen.queryByAltText("image.png")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "댓글 등록" }));
    expect(submit).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/images", expect.objectContaining({
      method: "DELETE", body: expect.stringContaining('"id":'),
    }));
  });
  it("lets users remove a failed preparation and submit their text when cancellation fails", async () => {
    vi.mocked(fetch).mockImplementation(async (_url, options) => ({
      ok: false,
      json: async () => ({
        message: options?.method === "DELETE"
          ? "업로드 취소에 실패했습니다."
          : "이미지 저장소 서버 설정이 필요합니다.",
      }),
    }) as Response);
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} submitAction={submit} />);
    fireEvent.change(screen.getByPlaceholderText("느낀 점을 남겨보세요"), {
      target: { value: "보존할 내용" },
    });
    fireEvent.change(screen.getByLabelText("첨부할 이미지 선택"), {
      target: { files: [upload()] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("이미지 저장소 서버 설정이 필요합니다.");

    fireEvent.click(screen.getByRole("button", { name: "image.png 첨부 제거" }));

    await waitFor(() => expect(screen.queryByAltText("image.png")).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "댓글 등록" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "댓글 등록" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith("보존할 내용", []));
  });
});
