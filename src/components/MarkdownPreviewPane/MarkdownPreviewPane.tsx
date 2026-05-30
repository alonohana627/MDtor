import { memo, type Ref } from "react";
import { type MarkdownBlock } from "../../markdown/types";
import { type DocumentDirection, type Theme } from "../../types";
import { MarkdownPreview } from "../MarkdownPreview";

type MarkdownPreviewPaneProps = {
  previewRef?: Ref<HTMLElement>;
  markdown: string;
  blocks?: MarkdownBlock[];
  currentLine: number;
  theme: Theme;
  direction: DocumentDirection;
  loadImage?: (src: string) => Promise<Blob>;
  onPreviewScroll?: (preview: HTMLElement) => void;
};

export const MarkdownPreviewPane = memo(function MarkdownPreviewPane({
  previewRef,
  markdown,
  blocks,
  currentLine,
  theme,
  direction,
  loadImage,
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
          blocks={blocks}
          currentLine={currentLine}
          theme={theme}
          direction={direction}
          loadImage={loadImage}
        />
      </article>
    </section>
  );
});
