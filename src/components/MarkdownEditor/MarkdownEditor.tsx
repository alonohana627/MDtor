import { type Ref } from "react";
import {
  CodeMirrorMarkdownEditor,
  type CodeMirrorMarkdownEditorHandle,
} from "../CodeMirrorMarkdownEditor";
import { type DocumentDirection } from "../../types";
import "./MarkdownEditor.css";

export type MarkdownEditorHandle = CodeMirrorMarkdownEditorHandle;

type MarkdownEditorProps = {
  value: string;
  currentLine: number;
  activeFilePath: string | null;
  isDirty: boolean;
  direction: DocumentDirection;
  isSaveDisabled: boolean;
  isTypewriterMode: boolean;
  editorRef?: Ref<MarkdownEditorHandle>;
  onChange: (nextValue: string) => void;
  onCurrentLineChange: (line: number) => void;
  onEditorScroll?: (scrollElement: HTMLElement) => void;
  onSave: () => void;
  onDirectionChange: (direction: DocumentDirection) => void;
};

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
        <CodeMirrorMarkdownEditor
          value={value}
          direction={direction}
          editorRef={editorRef}
          isTypewriterMode={isTypewriterMode}
          onChange={onChange}
          onCurrentLineChange={onCurrentLineChange}
          onEditorScroll={onEditorScroll}
        />
      </div>
    </section>
  );
}
