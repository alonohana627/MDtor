import { useMemo } from "react";
import { type DocumentDirection, type Theme } from "../../types";
import { parseMarkdown } from "../../markdown/parseMarkdown";
import { MarkdownBlockView } from "../MarkdownBlockView";
import "./MarkdownPreview.css";

type MarkdownPreviewProps = {
  markdown: string;
  currentLine: number;
  theme: Theme;
  direction: DocumentDirection;
};

export function MarkdownPreview({
  markdown,
  currentLine,
  theme,
  direction,
}: MarkdownPreviewProps) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  if (blocks.length === 0) {
    return <p className="empty-preview">Nothing to preview yet.</p>;
  }

  return (
    <>
      {blocks.map((block, index) => (
        <MarkdownBlockView
          key={index}
          block={block}
          currentLine={currentLine}
          theme={theme}
          direction={direction}
        />
      ))}
    </>
  );
}
