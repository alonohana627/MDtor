import { type DocumentDirection, type Theme } from "../../types";
import { MarkdownPreview } from "../MarkdownPreview";

type MarkdownPreviewPaneProps = {
  markdown: string;
  currentLine: number;
  theme: Theme;
  direction: DocumentDirection;
};

export function MarkdownPreviewPane({
  markdown,
  currentLine,
  theme,
  direction,
}: MarkdownPreviewPaneProps) {
  return (
    <section className="pane preview-pane" aria-labelledby="preview-title">
      <header className="pane-header">
        <h2 id="preview-title">Preview</h2>
      </header>
      <article className="preview" aria-live="polite" dir={direction}>
        <MarkdownPreview
          markdown={markdown}
          currentLine={currentLine}
          theme={theme}
          direction={direction}
        />
      </article>
    </section>
  );
}
