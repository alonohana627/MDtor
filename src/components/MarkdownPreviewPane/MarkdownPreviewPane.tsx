import { memo, type Ref } from "react";
import { type DocumentDirection } from "../../types";
import { MarkdownPreview } from "../MarkdownPreview";

type MarkdownPreviewPaneProps = {
  previewRef?: Ref<HTMLElement>;
  markdown: string;
  direction: DocumentDirection;
  currentLine: number;
  onPreviewScroll?: (preview: HTMLElement) => void;
};

export const MarkdownPreviewPane = memo(function MarkdownPreviewPane({
  previewRef,
  markdown,
  direction,
  currentLine,
  onPreviewScroll,
}: MarkdownPreviewPaneProps) {
  return (
    <section className="pane preview-pane" aria-labelledby="preview-title">
      <header className="pane-header">
        <h2 id="preview-title">Preview</h2>
      </header>
      <article
        ref={previewRef}
        className="preview"
        aria-live="polite"
        dir={direction}
        onScroll={(event) => onPreviewScroll?.(event.currentTarget)}
      >
        <MarkdownPreview
          markdown={markdown}
          direction={direction}
          currentLine={currentLine}
        />
      </article>
    </section>
  );
});
