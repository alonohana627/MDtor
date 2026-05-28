import { useMemo, useRef } from "react";
import { type DocumentDirection } from "../../App";
import { MarkdownHighlightLayer } from "../MarkdownHighlightLayer";
import "./MarkdownEditor.css";

type MarkdownEditorProps = {
  value: string;
  currentLine: number;
  activeFilePath: string | null;
  isDirty: boolean;
  direction: DocumentDirection;
  isSaveDisabled: boolean;
  onChange: (nextValue: string) => void;
  onCurrentLineChange: (line: number) => void;
  onSave: () => void;
  onDirectionChange: (direction: DocumentDirection) => void;
};

function getCurrentLine(value: string, cursorIndex: number) {
  return value.slice(0, cursorIndex).split("\n").length;
}

export function MarkdownEditor({
  value,
  currentLine,
  activeFilePath,
  isDirty,
  direction,
  isSaveDisabled,
  onChange,
  onCurrentLineChange,
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
        {isDirty ? <span className="dirty-marker" aria-label="Unsaved changes">*</span> : null}
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
            className="markdown-textarea"
            aria-label="Markdown editor"
            dir={direction}
            wrap="off"
            spellCheck="false"
            value={value}
            onChange={(event) => {
              onChange(event.currentTarget.value);
              updateCurrentLine(event.currentTarget);
            }}
            onClick={(event) => updateCurrentLine(event.currentTarget)}
            onKeyUp={(event) => updateCurrentLine(event.currentTarget)}
            onSelect={(event) => updateCurrentLine(event.currentTarget)}
            onScroll={(event) => syncLineNumberScroll(event.currentTarget)}
          />
        </div>
      </div>
    </section>
  );
}
