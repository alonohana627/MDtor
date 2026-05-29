import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "../../../src/components/MarkdownEditor";

function renderEditor(props: Partial<Parameters<typeof MarkdownEditor>[0]> = {}) {
  const defaultProps = {
    value: "line one\nline two\nline three",
    currentLine: 1,
    activeFilePath: "chapter-01.md",
    isDirty: false,
    direction: "ltr" as const,
    isSaveDisabled: false,
    onChange: vi.fn(),
    onCurrentLineChange: vi.fn(),
    onSave: vi.fn(),
    onDirectionChange: vi.fn(),
  };

  return {
    props: { ...defaultProps, ...props },
    ...render(<MarkdownEditor {...defaultProps} {...props} />),
  };
}

describe("MarkdownEditor", () => {
  it("renders the heading, current line label, line numbers, and editor value", () => {
    const { container } = renderEditor({ currentLine: 2 });

    expect(screen.getByRole("heading", { name: "chapter-01.md" })).toBeInTheDocument();
    expect(screen.getByText("Line 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown editor")).toHaveValue(
      "line one\nline two\nline three",
    );
    expect(container.querySelector(".line-number-gutter")).toHaveValue("1\n2\n3");
  });

  it("shows dirty state and emits save and direction changes", () => {
    const onSave = vi.fn();
    const onDirectionChange = vi.fn();
    const onCurrentLineChange = vi.fn();
    renderEditor({
      isDirty: true,
      onSave,
      onDirectionChange,
      onCurrentLineChange,
    });

    expect(screen.getByLabelText("Unsaved changes")).toHaveTextContent("*");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "RTL" }));
    fireEvent.keyUp(screen.getByLabelText("Markdown editor"));
    fireEvent.select(screen.getByLabelText("Markdown editor"));

    expect(onSave).toHaveBeenCalled();
    expect(onDirectionChange).toHaveBeenCalledWith("rtl");
    expect(onCurrentLineChange).toHaveBeenCalled();
  });

  it("switches back to LTR when asked", () => {
    const onDirectionChange = vi.fn();
    renderEditor({ direction: "rtl", onDirectionChange });

    fireEvent.click(screen.getByRole("button", { name: "LTR" }));

    expect(onDirectionChange).toHaveBeenCalledWith("ltr");
  });

  it("calls onChange with the next editor value", () => {
    const onChange = vi.fn();
    renderEditor({ onChange });

    fireEvent.change(screen.getByLabelText("Markdown editor"), {
      target: { value: "# New document" },
    });

    expect(onChange).toHaveBeenCalledWith("# New document");
  });

  it("reports the current cursor line", () => {
    const onCurrentLineChange = vi.fn();
    renderEditor({ onCurrentLineChange });

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
    const secondLineIndex = editor.value.indexOf("line two");
    editor.setSelectionRange(secondLineIndex, secondLineIndex);

    fireEvent.click(editor);

    expect(onCurrentLineChange).toHaveBeenCalledWith(2);
  });

  it("syncs line-number and highlight scroll positions with the textarea", () => {
    const { container } = renderEditor();
    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
    const gutter = container.querySelector(".line-number-gutter") as HTMLTextAreaElement;
    const highlightLayer = container.querySelector(
      ".markdown-highlight-layer",
    ) as HTMLPreElement;

    Object.defineProperty(editor, "scrollTop", { configurable: true, value: 32 });
    Object.defineProperty(editor, "scrollLeft", { configurable: true, value: 16 });

    fireEvent.scroll(editor);

    expect(gutter.scrollTop).toBe(32);
    expect(highlightLayer.scrollTop).toBe(32);
    expect(highlightLayer.scrollLeft).toBe(16);
  });

  it("exposes the editor textarea through editorRef", () => {
    const editorRef = createRef<HTMLTextAreaElement>();

    renderEditor({ editorRef });

    expect(editorRef.current).toBe(screen.getByLabelText("Markdown editor"));
  });
});
