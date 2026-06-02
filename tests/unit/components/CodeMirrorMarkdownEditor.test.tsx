import { fireEvent, render } from "@testing-library/react";
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

  it("updates document direction and external values without recreating the editor", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <CodeMirrorMarkdownEditor value="Text" direction="ltr" onChange={onChange} />,
    );
    const editorElement = container.querySelector(".cm-editor");

    rerender(
      <CodeMirrorMarkdownEditor value="שלום" direction="rtl" onChange={onChange} />,
    );

    expect(container.querySelector(".cm-editor")).toBe(editorElement);
    expect(container.querySelector(".cm-content")).toHaveAttribute("dir", "rtl");
    expect(container.querySelector(".cm-content")?.textContent).toContain("שלום");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes imperative focus, selection, and scroll helpers", () => {
    const editorRef = createRef<CodeMirrorMarkdownEditorHandle>();
    render(
      <CodeMirrorMarkdownEditor
        value={"First\nSecond\nThird"}
        direction="ltr"
        editorRef={editorRef}
        onChange={vi.fn()}
      />,
    );

    const handle = editorRef.current;

    expect(handle?.clientHeight).toBeGreaterThanOrEqual(0);
    expect(handle?.scrollHeight).toBeGreaterThanOrEqual(0);

    if (!handle) {
      throw new Error("Expected CodeMirror handle.");
    }

    handle.scrollTop = 12;
    expect(handle.scrollTop).toBe(12);

    handle.focus();
    handle.setSelectionRange(1000, 1000);
    handle.scrollTo({ top: 4 });
    handle.scrollTo();
    expect(handle.scrollTop).toBe(4);
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

  it("uses native scrollTo when the scroll element exposes it", () => {
    const editorRef = createRef<CodeMirrorMarkdownEditorHandle>();
    const { container } = render(
      <CodeMirrorMarkdownEditor
        value="Text"
        direction="ltr"
        editorRef={editorRef}
        onChange={vi.fn()}
      />,
    );
    const scroller = container.querySelector(".cm-scroller") as HTMLElement;
    const scrollTo = vi.fn();
    Object.defineProperty(scroller, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    editorRef.current?.scrollTo({ top: 24 });

    expect(scrollTo).toHaveBeenCalledWith({ top: 24 });
  });

  it("reports editor scrolls and keeps typewriter mode centered after edits", () => {
    const editorRef = createRef<CodeMirrorMarkdownEditorHandle>();
    const onEditorScroll = vi.fn();
    const onCurrentLineChange = vi.fn();
    const { container } = render(
      <CodeMirrorMarkdownEditor
        value={"First\nSecond"}
        direction="ltr"
        editorRef={editorRef}
        isTypewriterMode
        onChange={vi.fn()}
        onCurrentLineChange={onCurrentLineChange}
        onEditorScroll={onEditorScroll}
      />,
    );
    const scroller = container.querySelector(".cm-scroller") as HTMLElement;

    editorRef.current?.setSelectionRange(7, 7);
    fireEvent.scroll(scroller);

    expect(onCurrentLineChange).toHaveBeenCalledWith(2);
    expect(onEditorScroll).toHaveBeenCalledWith(scroller);
  });

  it("ignores imperative editor calls after unmount", () => {
    const editorRef = createRef<CodeMirrorMarkdownEditorHandle>();
    const { unmount } = render(
      <CodeMirrorMarkdownEditor
        value="Text"
        direction="ltr"
        editorRef={editorRef}
        onChange={vi.fn()}
      />,
    );
    const handle = editorRef.current;

    if (!handle) {
      throw new Error("Expected CodeMirror handle.");
    }

    unmount();

    expect(() => {
      handle.scrollTop = 5;
      handle.replaceDocument("Next");
      handle.scrollTo({ top: 24 });
      handle.scrollTo();
      handle.setSelectionRange(1, 1);
    }).not.toThrow();
    expect(handle.clientHeight).toBe(0);
    expect(handle.scrollHeight).toBe(0);
    expect(handle.scrollTop).toBe(0);
  });
});
