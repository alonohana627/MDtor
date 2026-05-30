import { type Ref, useMemo, useRef } from "react";
import { type DocumentDirection } from "../../types";
import { MarkdownHighlightLayer } from "../MarkdownHighlightLayer";
import "./MarkdownEditor.css";

type MarkdownEditorProps = {
  value: string;
  currentLine: number;
  activeFilePath: string | null;
  isDirty: boolean;
  direction: DocumentDirection;
  isSaveDisabled: boolean;
  isTypewriterMode: boolean;
  editorRef?: Ref<HTMLTextAreaElement>;
  onChange: (nextValue: string) => void;
  onCurrentLineChange: (line: number) => void;
  onEditorScroll?: (textarea: HTMLTextAreaElement) => void;
  onSave: () => void;
  onDirectionChange: (direction: DocumentDirection) => void;
};

const EDITOR_TEXT_DIRECTION = "auto";

export function getCurrentLine(value: string, cursorIndex: number) {
  return value.slice(0, cursorIndex).split("\n").length;
}

function restoreCursorPosition(
  textarea: HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd: number,
  selectionDirection: "forward" | "backward" | "none",
) {
  window.requestAnimationFrame(() => {
    if (document.activeElement !== textarea) {
      return;
    }

    const cursorStart = Math.min(selectionStart, textarea.value.length);
    const cursorEnd = Math.min(selectionEnd, textarea.value.length);
    textarea.setSelectionRange(cursorStart, cursorEnd, selectionDirection);
  });
}

export function MarkdownEditor({
  value,
  currentLine,
  activeFilePath,
  isDirty,
  direction,
  isSaveDisabled,
  isTypewriterMode,
  editorRef,
  onChange,
  onCurrentLineChange,
  onEditorScroll,
  onSave,
  onDirectionChange,
}: MarkdownEditorProps) {
  const gutterRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbers = useMemo(
    () =>
      Array.from({ length: value.split("\n").length }, (_, index) => index + 1).join(
        "\n",
      ),
    [value],
  );

  function updateCurrentLine(textarea: HTMLTextAreaElement) {
    onCurrentLineChange(getCurrentLine(textarea.value, textarea.selectionStart));

    if (isTypewriterMode) {
      const currentLineIndex =
        getCurrentLine(textarea.value, textarea.selectionStart) - 1;
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(textarea).lineHeight || "24",
      );
      const nextScrollTop =
        currentLineIndex * lineHeight - textarea.clientHeight / 2 + lineHeight;

      textarea.scrollTo({
        top: Math.max(0, nextScrollTop),
        behavior: "smooth",
      });
    }
  }

  function syncLineNumberScroll(textarea: HTMLTextAreaElement) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop;
    }

    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop;
      highlightRef.current.scrollLeft = textarea.scrollLeft;
    }
  }

  return (
    <section className="pane editor-pane" aria-labelledby="editor-title">
      <header className="pane-header">
        <h1 id="editor-title">{activeFilePath ?? "Markdown"}</h1>
        {isDirty ? (
          <span className="dirty-marker" aria-label="Unsaved changes">
            *
          </span>
        ) : null}
        <div className="editor-actions" aria-label="Document controls">
          <div className="direction-control" role="group" aria-label="Document direction">
            <button
              type="button"
              className={direction === "ltr" ? "active" : undefined}
              aria-pressed={direction === "ltr"}
              onClick={() => onDirectionChange("ltr")}
            >
              LTR
            </button>
            <button
              type="button"
              className={direction === "rtl" ? "active" : undefined}
              aria-pressed={direction === "rtl"}
              onClick={() => onDirectionChange("rtl")}
            >
              RTL
            </button>
          </div>
          <button
            type="button"
            className="save-button"
            disabled={isSaveDisabled}
            onClick={onSave}
          >
            Save
          </button>
        </div>
        <span className="current-line-label">Line {currentLine}</span>
      </header>
      <div className="editor-surface" dir={direction}>
        <textarea
          ref={gutterRef}
          className="line-number-gutter"
          aria-hidden="true"
          readOnly
          tabIndex={-1}
          value={lineNumbers}
        />
        <div className="markdown-editor-stack">
          <MarkdownHighlightLayer ref={highlightRef} markdown={value} />
          <textarea
            ref={editorRef}
            className="markdown-textarea"
            aria-label="Markdown editor"
            data-document-direction={direction}
            dir={EDITOR_TEXT_DIRECTION}
            wrap="off"
            spellCheck="false"
            value={value}
            onChange={(event) => {
              const textarea = event.currentTarget;
              const selectionStart = textarea.selectionStart;
              const selectionEnd = textarea.selectionEnd;
              const selectionDirection = textarea.selectionDirection;

              onChange(event.currentTarget.value);
              updateCurrentLine(textarea);
              restoreCursorPosition(
                textarea,
                selectionStart,
                selectionEnd,
                selectionDirection,
              );
            }}
            onClick={(event) => updateCurrentLine(event.currentTarget)}
            onKeyUp={(event) => updateCurrentLine(event.currentTarget)}
            onSelect={(event) => updateCurrentLine(event.currentTarget)}
            onScroll={(event) => {
              syncLineNumberScroll(event.currentTarget);
              onEditorScroll?.(event.currentTarget);
            }}
          />
        </div>
      </div>
    </section>
  );
}
