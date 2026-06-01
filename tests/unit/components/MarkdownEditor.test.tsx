import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "../../../src/components/MarkdownEditor";

function renderEditor(props: Partial<Parameters<typeof MarkdownEditor>[0]> = {}) {
  const defaultProps = {
    value: "line one\nline two\nline three",
    currentLine: 1,
    activeFilePath: "chapter-01.md",
    isDirty: false,
    direction: "ltr" as const,
    isSaveDisabled: false,
    isTypewriterMode: false,
    onChange: vi.fn(),
    onCurrentLineChange: vi.fn(),
    onSave: vi.fn(),
    onDirectionChange: vi.fn(),
  };

  return render(<MarkdownEditor {...defaultProps} {...props} />);
}

describe("MarkdownEditor", () => {
  it("renders document controls and the CodeMirror editor host", () => {
    const { container } = renderEditor({ currentLine: 2 });

    expect(screen.getByRole("heading", { name: "chapter-01.md" })).toBeInTheDocument();
    expect(screen.getByText("Line 2")).toBeInTheDocument();
    expect(container.querySelector(".codemirror-markdown-editor-host")).not.toBeNull();
  });

  it("shows dirty state and emits save and direction changes", () => {
    const onSave = vi.fn();
    const onDirectionChange = vi.fn();

    renderEditor({
      isDirty: true,
      onSave,
      onDirectionChange,
    });

    expect(screen.getByLabelText("Unsaved changes")).toHaveTextContent("*");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "RTL" }));

    expect(onSave).toHaveBeenCalled();
    expect(onDirectionChange).toHaveBeenCalledWith("rtl");
  });

  it("switches back to LTR when asked", () => {
    const onDirectionChange = vi.fn();

    renderEditor({ direction: "rtl", onDirectionChange });
    fireEvent.click(screen.getByRole("button", { name: "LTR" }));

    expect(onDirectionChange).toHaveBeenCalledWith("ltr");
  });

  it("exposes an imperative editor handle", () => {
    const editorRef = createRef<MarkdownEditorHandle>();

    renderEditor({ editorRef });

    expect(editorRef.current).not.toBeNull();
    expect(typeof editorRef.current?.focus).toBe("function");
    expect(typeof editorRef.current?.setSelectionRange).toBe("function");
  });

  it.each(["ltr", "rtl"] as const)(
    "passes %s direction to the CodeMirror content",
    (direction) => {
      const { container } = renderEditor({ direction });

      expect(container.querySelector(".cm-content")).toHaveAttribute("dir", direction);
    },
  );

});
