import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "@tiptap/react";
import { ReviewEditor } from "../ReviewEditor";

type FakeEditor = {
  getJSON: () => object;
  getText: () => string;
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

function makeEditor(): FakeEditor {
  return {
    getJSON: () => ({ type: "doc", content: [{ type: "paragraph" }] }),
    getText: () => currentText,
  };
}

describe("ReviewEditor", () => {
  beforeEach(() => {
    currentText = "";
    editorOptions = undefined;
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
});
