import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createMarkdownHighlightIndex,
  getMarkdownHighlightLineCount,
} from "../../markdown/highlightMarkdown";
import { type DocumentDirection } from "../../types";
import { MarkdownHighlightLayer } from "../MarkdownHighlightLayer";
import { getCurrentLine, getCurrentLineFromLineStarts } from "./editorTextMetrics";
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
const TYPEWRITER_SMOOTH_LINE_LIMIT = 400;

function createLineNumbers(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRestoreIdRef = useRef(0);
  const highlightViewportFrameRef = useRef<number | null>(null);
  const lastReportedLineRef = useRef(currentLine);
  const [highlightViewport, setHighlightViewport] = useState({
    scrollTop: 0,
    viewportHeight: 0,
  });
  const highlightIndex = useMemo(() => createMarkdownHighlightIndex(value), [value]);
  const lineCount = getMarkdownHighlightLineCount(highlightIndex);
  const lineNumbers = useMemo(() => createLineNumbers(lineCount), [lineCount]);
  useImperativeHandle(editorRef, () => textareaRef.current as HTMLTextAreaElement, []);

  useEffect(() => {
    lastReportedLineRef.current = currentLine;
  }, [currentLine]);

  useEffect(() => {
    return () => {
      if (highlightViewportFrameRef.current !== null) {
        window.cancelAnimationFrame(highlightViewportFrameRef.current);
      }
    };
  }, []);

  function queueCursorRestore(
    textarea: HTMLTextAreaElement,
    selectionStart: number,
    selectionEnd: number,
    selectionDirection: "forward" | "backward" | "none",
  ) {
    const restoreId = cursorRestoreIdRef.current + 1;
    cursorRestoreIdRef.current = restoreId;

    window.requestAnimationFrame(() => {
      if (
        cursorRestoreIdRef.current !== restoreId ||
        document.activeElement !== textarea
      ) {
        return;
      }

      const cursorStart = Math.min(selectionStart, textarea.value.length);
      const cursorEnd = Math.min(selectionEnd, textarea.value.length);
      textarea.setSelectionRange(cursorStart, cursorEnd, selectionDirection);
    });
  }

  function updateHighlightViewportNow(textarea: HTMLTextAreaElement) {
    const scrollTop = Math.max(0, textarea.scrollTop);
    const viewportHeight = Math.max(0, textarea.clientHeight);

    setHighlightViewport((currentViewport) => {
      if (
        currentViewport.scrollTop === scrollTop &&
        currentViewport.viewportHeight === viewportHeight
      ) {
        return currentViewport;
      }

      return { scrollTop, viewportHeight };
    });
  }

  function scheduleHighlightViewportUpdate(textarea: HTMLTextAreaElement) {
    if (highlightViewportFrameRef.current !== null) {
      return;
    }

    highlightViewportFrameRef.current = window.requestAnimationFrame(() => {
      highlightViewportFrameRef.current = null;
      updateHighlightViewportNow(textarea);
    });
  }

  function updateCurrentLineNow(
    textarea: HTMLTextAreaElement,
    source: "line-index" | "textarea-value" = "line-index",
  ) {
    const nextLine =
      source === "textarea-value"
        ? getCurrentLine(textarea.value, textarea.selectionStart)
        : getCurrentLineFromLineStarts(
            highlightIndex.lineStarts,
            textarea.selectionStart,
          );

    if (nextLine !== lastReportedLineRef.current) {
      lastReportedLineRef.current = nextLine;
      onCurrentLineChange(nextLine);
    }

    if (isTypewriterMode) {
      const currentLineIndex = nextLine - 1;
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(textarea).lineHeight || "24",
      );
      const nextScrollTop =
        currentLineIndex * lineHeight - textarea.clientHeight / 2 + lineHeight;

      textarea.scrollTo({
        top: Math.max(0, nextScrollTop),
        behavior: lineCount > TYPEWRITER_SMOOTH_LINE_LIMIT ? "auto" : "smooth",
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

    scheduleHighlightViewportUpdate(textarea);
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
          <MarkdownHighlightLayer
            ref={highlightRef}
            highlightIndex={highlightIndex}
            scrollTop={highlightViewport.scrollTop}
            viewportHeight={highlightViewport.viewportHeight}
          />
          <textarea
            ref={textareaRef}
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
              updateCurrentLineNow(textarea, "textarea-value");
              updateHighlightViewportNow(textarea);
              queueCursorRestore(
                textarea,
                selectionStart,
                selectionEnd,
                selectionDirection,
              );
            }}
            onClick={(event) => updateCurrentLineNow(event.currentTarget)}
            onKeyUp={(event) => updateCurrentLineNow(event.currentTarget)}
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
