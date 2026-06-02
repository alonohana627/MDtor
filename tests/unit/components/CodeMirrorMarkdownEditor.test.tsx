import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CodeMirrorMarkdownEditor,
  type CodeMirrorMarkdownEditorHandle,
} from "../../../src/components/CodeMirrorMarkdownEditor";

describe("CodeMirrorMarkdownEditor", () => {
  it("renders the editor and displays the initial value", () => {
    const { container } = render(
      <CodeMirrorMarkdownEditor value="# Title" direction="ltr" onChange={vi.fn()} />,
    );

    expect(container.querySelector(".cm-editor")).not.toBeNull();
    expect(container.querySelector(".cm-content")?.textContent).toContain("Title");
  });

  it.each(["ltr", "rtl"] as const)("applies %s direction", (direction) => {
    const { container } = render(
      <CodeMirrorMarkdownEditor value="Text" direction={direction} onChange={vi.fn()} />,
    );

    expect(container.querySelector(".cm-content")).toHaveAttribute("dir", direction);
    expect(container.querySelector(".cm-editor")).toHaveAttribute("dir", direction);
  });

  it("uses the native caret instead of CodeMirror's custom cursor layer", () => {
    const { container } = render(
      <CodeMirrorMarkdownEditor value="שלום" direction="rtl" onChange={vi.fn()} />,
    );

    expect(container.querySelector(".cm-cursorLayer")).toBeNull();
  });

  it("calls onChange when CodeMirror changes the document", () => {
    const onChange = vi.fn();
    const editorRef = createRef<CodeMirrorMarkdownEditorHandle>();
    render(
      <CodeMirrorMarkdownEditor
        value="Text"
        direction="ltr"
        editorRef={editorRef}
        onChange={onChange}
      />,
    );

    editorRef.current?.replaceDocument("Text!");

    expect(onChange).toHaveBeenCalledWith("Text!");
  });

  it("does not call onChange when props rerender without document changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeMirrorMarkdownEditor value="Text" direction="ltr" onChange={onChange} />,
    );

    rerender(
      <CodeMirrorMarkdownEditor value="Text" direction="ltr" onChange={onChange} />,
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});
