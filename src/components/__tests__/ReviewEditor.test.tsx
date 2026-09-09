import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "@tiptap/react";
import { ReviewEditor } from "../ReviewEditor";

type CommandName =
  | "undo"
  | "redo"
  | "toggleBold"
  | "toggleItalic"
  | "toggleStrike"
  | "toggleHeading"
  | "toggleBulletList"
  | "toggleOrderedList"
  | "toggleBlockquote"
  | "setHorizontalRule"
  | "unsetAllMarks"
  | "clearNodes";

type FakeEditor = {
  state: { doc: { descendants: () => void } };
  getJSON: () => object;
  getText: () => string;
  chain: () => FakeChain;
  can: () => { chain: () => FakeChain };
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean;
  commands: { focus: () => void };
};

type FakeChain = {
  focus: () => FakeChain;
  run: () => boolean;
} & Record<CommandName, (...args: unknown[]) => FakeChain>;

type ActiveState = {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  heading2?: boolean;
  heading3?: boolean;
  bulletList?: boolean;
  orderedList?: boolean;
  blockquote?: boolean;
};

type UseEditorOptions = {
  onUpdate?: (args: { editor: FakeEditor }) => void;
};

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(),
  EditorContent: () => <div data-testid="editor-content" />,
}));

let currentText = "";
let editorOptions: UseEditorOptions | undefined;
let commandSpy: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
let activeState: ActiveState;
let canRunByCommand: Partial<Record<CommandName, boolean>>;
let focusSpy: ReturnType<typeof vi.fn<() => void>>;

function makeChain(mode: "command" | "can"): FakeChain {
  let lastCommand: CommandName | null = null;
  const chain = {
    focus: () => chain,
    run: () => {
      if (mode === "can" && lastCommand) {
        return canRunByCommand[lastCommand] ?? true;
      }
      return true;
    },
  } as FakeChain;

  const addCommand = (name: CommandName) => {
    chain[name] = (...args: unknown[]) => {
      lastCommand = name;
      if (mode === "command") {
        commandSpy(name, ...args);
      }
      return chain;
    };
  };

  (
    [
      "undo",
      "redo",
      "toggleBold",
      "toggleItalic",
      "toggleStrike",
      "toggleHeading",
      "toggleBulletList",
      "toggleOrderedList",
      "toggleBlockquote",
      "setHorizontalRule",
      "unsetAllMarks",
      "clearNodes",
    ] as CommandName[]
  ).forEach(addCommand);

  return chain;
}

function makeEditor(): FakeEditor {
  return {
    state: { doc: { descendants: () => {} } },
    getJSON: () => ({ type: "doc", content: [{ type: "paragraph" }] }),
    getText: () => currentText,
    chain: () => makeChain("command"),
    can: () => ({ chain: () => makeChain("can") }),
    isActive: (name, attrs) => {
      if (name === "heading" && attrs?.level === 2) {
        return activeState.heading2 ?? false;
      }
      if (name === "heading" && attrs?.level === 3) {
        return activeState.heading3 ?? false;
      }
      return activeState[name as keyof ActiveState] ?? false;
    },
    commands: { focus: focusSpy },
  };
}

describe("ReviewEditor", () => {
  beforeEach(() => {
    currentText = "";
    editorOptions = undefined;
    commandSpy = vi.fn();
    activeState = {};
    canRunByCommand = {};
    focusSpy = vi.fn();
    vi.mocked(useEditor).mockImplementation((options: unknown) => {
      editorOptions = options as UseEditorOptions;
      return makeEditor() as never;
    });
  });

  it("disables submit controls while content is shorter than minChars", async () => {
    render(
      <form>
        <ReviewEditor minChars={5} />
        <button type="submit">Submit</button>
      </form>,
    );

    const submitButton = screen.getByRole("button", { name: "Submit" });
    await waitFor(() => expect(submitButton).toBeDisabled());

    act(() => {
      currentText = "12345";
      editorOptions?.onUpdate?.({ editor: makeEditor() });
    });

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("leaves submit controls enabled when minChars is disabled", async () => {
    const { container } = render(
      <form>
        <ReviewEditor minChars={null} />
        <button type="submit">Submit</button>
      </form>,
    );

    expect(container.querySelector("p")).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled(),
    );
  });

  it("blocks submission using the latest editor length", async () => {
    currentText = "12345";
    const { container } = render(
      <form>
        <ReviewEditor minChars={5} />
        <button type="submit">Submit</button>
      </form>,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled(),
    );

    currentText = "1";
    const submitted = fireEvent.submit(container.querySelector("form")!);

    expect(submitted).toBe(false);
    expect(focusSpy).toHaveBeenCalled();
  });

  it("renders editor toolbar controls", () => {
    render(<ReviewEditor minChars={null} />);

    expect(screen.getByRole("toolbar", { name: "에디터 도구 모음" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "실행 취소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "굵게" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "불렛 목록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "번호 목록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "구분선" })).toBeInTheDocument();
  });

  it("shows the spellcheck action only when enabled", () => {
    const { rerender } = render(<ReviewEditor minChars={null} />);

    expect(
      screen.queryByRole("button", { name: "맞춤법 검사하기" }),
    ).not.toBeInTheDocument();

    rerender(<ReviewEditor minChars={null} spellcheckEnabled />);

    expect(
      screen.getByRole("button", { name: "맞춤법 검사하기" }),
    ).toBeInTheDocument();
  });

  it("runs the matching TipTap command when a toolbar button is clicked", () => {
    render(<ReviewEditor minChars={null} />);

    fireEvent.click(screen.getByRole("button", { name: "굵게" }));

    expect(commandSpy).toHaveBeenCalledWith("toggleBold");
  });

  it("reflects active and disabled toolbar states", () => {
    activeState = { bold: true };
    canRunByCommand = { toggleItalic: false };

    render(<ReviewEditor minChars={null} />);

    expect(screen.getByRole("button", { name: "굵게" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "기울임" })).toBeDisabled();
  });
});
