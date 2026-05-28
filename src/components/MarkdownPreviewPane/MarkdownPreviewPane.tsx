import { type Theme } from "../../App";
import { MarkdownPreview } from "../MarkdownPreview";

type MarkdownPreviewPaneProps = {
  markdown: string;
  currentLine: number;
  theme: Theme;
};

export function MarkdownPreviewPane({
  markdown,
  currentLine,
  theme,
}: MarkdownPreviewPaneProps) {
  return (
    <section className="pane preview-pane" aria-labelledby="preview-title">
      <header className="pane-header">
        <h2 id="preview-title">Preview</h2>
      </header>
      <article className="preview" aria-live="polite">
        <MarkdownPreview markdown={markdown} currentLine={currentLine} theme={theme} />
      </article>
    </section>
  );
}
