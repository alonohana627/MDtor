import { useMemo, useRef } from "react";
import { MarkdownHighlightLayer } from "../MarkdownHighlightLayer";
import "./MarkdownEditor.css";

type MarkdownEditorProps = {
  value: string;
  currentLine: number;
  onChange: (nextValue: string) => void;
  onCurrentLineChange: (line: number) => void;
};

function getCurrentLine(value: string, cursorIndex: number) {
  return value.slice(0, cursorIndex).split("\n").length;
}

export function MarkdownEditor({
  value,
  currentLine,
  onChange,
  onCurrentLineChange,
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
        <h1 id="editor-title">Markdown</h1>
        <span className="current-line-label">Line {currentLine}</span>
      </header>
      <div className="editor-surface">
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
