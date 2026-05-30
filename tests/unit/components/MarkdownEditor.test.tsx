import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    isTypewriterMode: false,
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
  it("keeps textarea caret layout stable while preserving the highlight layer", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/components/MarkdownEditor/MarkdownEditor.css"),
      "utf8",
    );

    expect(css).not.toMatch(/\.markdown-highlight-layer\s*{[\s\S]*display: none;/);
    expect(css).toMatch(
      /@supports \(-webkit-text-fill-color: transparent\) {[\s\S]*\.markdown-textarea\s*{[\s\S]*color: var\(--editor-text\);[\s\S]*-webkit-text-fill-color: transparent;/,
    );
  });

  it("restores the insertion point after controlled value updates", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    renderEditor({ value: "my name is alon" });

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
    editor.focus();
    editor.value = "my name is alon!";
    editor.setSelectionRange(editor.value.length, editor.value.length);

    fireEvent.change(editor);

    expect(editor.selectionStart).toBe("my name is alon!".length);
    expect(editor.selectionEnd).toBe("my name is alon!".length);
  });

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

  it.each(["ltr", "rtl"] as const)(
    "uses paragraph auto-direction for caret placement in %s documents",
    (direction) => {
      renderEditor({ direction, value: "my name is alon" });

      const editor = screen.getByLabelText("Markdown editor");

      expect(editor).toHaveAttribute("dir", "auto");
      expect(editor).toHaveAttribute("data-document-direction", direction);
    },
  );

  it.each(["ltr", "rtl"] as const)(
    "keeps the insertion point at the typed text end in %s documents",
    (direction) => {
      renderEditor({ direction, value: "my name is alon" });

      const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
      editor.value = "my name is alon!";
      editor.setSelectionRange(editor.value.length, editor.value.length);

      fireEvent.input(editor);

      expect(editor.selectionStart).toBe("my name is alon!".length);
      expect(editor.selectionEnd).toBe("my name is alon!".length);
    },
  );

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

  it("centers the active line when typewriter mode is enabled", () => {
    const scrollTo = vi.fn();
    renderEditor({ isTypewriterMode: true });

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
    Object.defineProperty(editor, "clientHeight", { configurable: true, value: 120 });
    Object.defineProperty(editor, "scrollTo", { configurable: true, value: scrollTo });
    editor.setSelectionRange(
      editor.value.indexOf("line three"),
      editor.value.indexOf("line three"),
    );

    fireEvent.click(editor);

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });
});
