import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HighlightWithComments } from "@/lib/highlight";
import type { JSONContent } from "@tiptap/core";

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

const { mockRemoveChannel } = vi.hoisted(() => ({
  mockRemoveChannel: vi.fn(),
}));

// ─── vi.hoisted로 hoisting-safe mock 변수 선언 ────────────────────────────────
const { useEditorMock, mockDispatch, mockAddEventListener, editorDom } =
  vi.hoisted(() => {
    const mockDispatch = vi.fn();
    const mockAddEventListener = vi.fn();
    const editorDom = document.createElement("div");
    editorDom.addEventListener = mockAddEventListener;

    const mockMarkType = {
      create: vi.fn((attrs: unknown) => ({ type: "highlight-mark", attrs })),
    };

    const mockEditor = {
      state: {
        schema: { marks: { highlight: mockMarkType } },
        get tr() {
          return {
            addMark: vi.fn().mockReturnThis(),
            removeMark: vi.fn().mockReturnThis(),
          };
        },
        doc: { textBetween: vi.fn(() => "선택된 텍스트") },
      },
      view: {
        dom: editorDom,
        dispatch: mockDispatch,
        posAtDOM: vi.fn((_node: unknown, offset: number) => offset + 1),
      },
      on: vi.fn(),
      off: vi.fn(),
    };

    const useEditorMock = vi.fn(() => mockEditor);

    return { useEditorMock, mockDispatch, mockAddEventListener, editorDom };
  });

// ─── TipTap mock ─────────────────────────────────────────────────────────────
vi.mock("@tiptap/react", () => ({
  useEditor: useEditorMock,
  EditorContent: ({ editor }: { editor: unknown }) =>
    editor ? <div data-testid="tiptap-editor" /> : null,
}));

// next/dynamic mock (EmojiPicker via EmojiReactionBar)
vi.mock("next/dynamic", () => ({
  default: () => {
    const MockComponent = () => <div data-testid="emoji-picker-mock" />;
    return MockComponent;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@supabase/client", () => ({
  createClient: () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    return {
      channel: vi.fn(() => channel),
      removeChannel: mockRemoveChannel,
    };
  },
}));

// fetch mock
const mockFetch = vi.fn();

// ─── helpers ─────────────────────────────────────────────────────────────────
const { ReviewViewerInteractive } = await import("../ReviewViewerInteractive");

const defaultContent: JSONContent = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "본문 내용" }] },
  ],
};

const makeHighlight = (
  overrides?: Partial<HighlightWithComments>,
): HighlightWithComments => ({
  id: "h1",
  highlightText: "선택된 텍스트",
  authorId: "author-1",
  authorNickname: "홍길동",
  startPos: 1,
  endPos: 10,
  comments: [],
  ...overrides,
});

// ─── 텍스트 선택 시뮬레이션 helper ─────────────────────────────────────────────
function simulateTextSelection(text: string) {
  const textNode = document.createTextNode(text);
  editorDom.appendChild(textNode);

  const mockRange = {
    toString: () => text,
    startContainer: textNode,
    startOffset: 0,
    endContainer: textNode,
    endOffset: text.length,
    getBoundingClientRect: () => ({
      left: 100,
      top: 200,
      width: 50,
      right: 150,
      bottom: 220,
    }),
    commonAncestorContainer: textNode,
  };

  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => mockRange,
  } as unknown as Selection);

  return { textNode, mockRange };
}

// ─── tests ───────────────────────────────────────────────────────────────────
describe("ReviewViewerInteractive", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    mockDispatch.mockReset();
    mockRemoveChannel.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    // restore addEventListener mock after restoreAllMocks
    editorDom.addEventListener = mockAddEventListener;
    mockAddEventListener.mockReset();
    // clean up editorDom children
    while (editorDom.firstChild) editorDom.removeChild(editorDom.firstChild);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("TipTap EditorContent를 렌더링한다", () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
      />,
    );
    expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
  });

  it("useEditor에 editable: false로 호출된다", () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
      />,
    );
    const firstArg = (useEditorMock.mock.calls as unknown[][])[0]?.[0] as
      | { editable: boolean }
      | undefined;
    expect(firstArg?.editable).toBe(false);
  });

  it("초기 하이라이트가 있을 때 marks를 editor에 적용한다", () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[makeHighlight()]}
      />,
    );
    // tr.addMark가 호출되어 editor.view.dispatch가 호출됨
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("초기 하이라이트가 없으면 dispatch를 호출하지 않는다", () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
      />,
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("disabled=false일 때 selectionchange 이벤트 리스너가 등록된다", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );
    const eventNames = addEventListenerSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain("selectionchange");
  });

  it("disabled=true일 때 selectionchange 이벤트 리스너가 등록되지 않는다", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={true}
      />,
    );
    const eventNames = addEventListenerSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).not.toContain("selectionchange");
  });

  it("텍스트 선택 시 선택 팝업이 나타난다", async () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );

    document.body.appendChild(editorDom);
    const { textNode } = simulateTextSelection("본문 내용");

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });

    await waitFor(() => {
      expect(screen.getByText("하이라이트")).toBeInTheDocument();
    });

    document.body.removeChild(editorDom);
    editorDom.removeChild(textNode);
  });

  it("선택된 텍스트가 공백이면 팝업이 나타나지 않는다", async () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );

    document.body.appendChild(editorDom);
    const textNode = document.createTextNode("   ");
    editorDom.appendChild(textNode);

    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({
        toString: () => "   ",
        startContainer: textNode,
        startOffset: 0,
        endContainer: textNode,
        endOffset: 3,
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 0,
          right: 0,
          bottom: 0,
        }),
        commonAncestorContainer: textNode,
      }),
    } as unknown as Selection);

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });

    expect(screen.queryByText("하이라이트")).not.toBeInTheDocument();

    document.body.removeChild(editorDom);
    editorDom.removeChild(textNode);
  });

  it("에디터 외부 선택이면 팝업이 나타나지 않는다", async () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );

    // editor DOM이 document.body에 없으면 contains()가 false 반환
    const outsideNode = document.createTextNode("외부 텍스트");

    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({
        toString: () => "외부 텍스트",
        startContainer: outsideNode,
        startOffset: 0,
        endContainer: outsideNode,
        endOffset: 5,
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 50,
          right: 50,
          bottom: 10,
        }),
        commonAncestorContainer: outsideNode,
      }),
    } as unknown as Selection);

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });

    expect(screen.queryByText("하이라이트")).not.toBeInTheDocument();
  });

  it("하이라이트 버튼 클릭 시 API를 호출하고 HighlightCommentPanel을 연다", async () => {
    const user = userEvent.setup();
    const newHighlight = makeHighlight({
      id: "h-new",
      highlightText: "본문 내용",
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newHighlight,
    });

    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );

    document.body.appendChild(editorDom);
    const { textNode } = simulateTextSelection("본문 내용");

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });

    await waitFor(() => screen.getByText("하이라이트"));
    await user.click(screen.getByRole("button", { name: /하이라이트/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reviews/review-1/highlights",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "하이라이트가 저장되었습니다.",
    );

    // HighlightCommentPanel이 열리면 SheetTitle이 나타남
    await waitFor(() => {
      expect(screen.getByText("하이라이트 댓글")).toBeInTheDocument();
    });

    document.body.removeChild(editorDom);
    editorDom.removeChild(textNode);
  });

  it("하이라이트 생성 API 실패 시 콘솔 오류를 기록한다", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "서버 오류" }),
    });

    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );

    document.body.appendChild(editorDom);
    const { textNode } = simulateTextSelection("본문");

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    await waitFor(() => screen.getByText("하이라이트"));
    await user.click(screen.getByRole("button", { name: /하이라이트/ }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("서버 오류");
      expect(consoleSpy).toHaveBeenCalledWith(
        "하이라이트 생성 실패:",
        expect.any(Error),
      );
    });

    document.body.removeChild(editorDom);
    editorDom.removeChild(textNode);
  });

  it("editor.view.dom에 click 이벤트 리스너가 등록된다", () => {
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[makeHighlight()]}
      />,
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );
  });

  it("editor가 null이면 EditorContent가 렌더링되지 않는다", () => {
    useEditorMock.mockImplementationOnce(() => null as never);
    render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
      />,
    );
    expect(screen.queryByTestId("tiptap-editor")).not.toBeInTheDocument();
  });

  it("컴포넌트 언마운트 시 selectionchange 리스너가 제거된다", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <ReviewViewerInteractive
        content={defaultContent}
        reviewId="review-1"
        initialHighlights={[]}
        disabled={false}
      />,
    );

    unmount();

    const eventNames = removeEventListenerSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain("selectionchange");
  });
});
