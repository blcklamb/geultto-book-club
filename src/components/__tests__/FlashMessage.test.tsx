import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const {
  useSearchParamsMock,
  useRouterMock,
  usePathnameMock,
  replaceMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  usePathnameMock: vi.fn(),
  replaceMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
  useRouter: useRouterMock,
  usePathname: usePathnameMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import { FlashMessage } from "../FlashMessage";

describe("FlashMessage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    useRouterMock.mockReturnValue({ replace: replaceMock });
    usePathnameMock.mockReturnValue("/reviews/1");
  });

  it("success 쿼리를 success 토스트로 보여주고 URL에서 제거한다", async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        "success=%EB%93%B1%EB%A1%9D%20%EC%99%84%EB%A3%8C&cohort=5",
      ),
    );

    render(<FlashMessage />);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("등록 완료", {
        id: "/reviews/1:success",
      });
      expect(replaceMock).toHaveBeenCalledWith("/reviews/1?cohort=5");
    });
  });

  it("error 쿼리를 error 토스트로 보여주고 URL에서 제거한다", async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("error=%EC%8B%A4%ED%8C%A8"),
    );

    render(<FlashMessage />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("실패", {
        id: "/reviews/1:error",
      });
      expect(replaceMock).toHaveBeenCalledWith("/reviews/1");
    });
  });

  it("SSR 렌더링이 error 쿼리에 의존하는 경로에서는 URL 정리를 건너뛴다", async () => {
    usePathnameMock.mockReturnValue("/pending");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("error=%EA%B6%8C%ED%95%9C%20%EC%97%86%EC%9D%8C"),
    );

    render(<FlashMessage />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("권한 없음", {
        id: "/pending:error",
      });
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
