import { forwardRef, useMemo } from "react";
import { highlightMarkdown } from "../../markdown/highlightMarkdown";

type MarkdownHighlightLayerProps = {
  markdown: string;
};

export const MarkdownHighlightLayer = forwardRef<
  HTMLPreElement,
  MarkdownHighlightLayerProps
>(function MarkdownHighlightLayer({ markdown }, ref) {
  const lines = useMemo(() => highlightMarkdown(markdown), [markdown]);

  return (
    <pre ref={ref} className="markdown-highlight-layer" aria-hidden="true">
      {lines.map((line, lineIndex) => (
        <span className="highlight-line" key={lineIndex}>
          {line.map((token, tokenIndex) => (
            <span className={`md-token md-token-${token.type}`} key={tokenIndex}>
              {token.text}
            </span>
          ))}
          {lineIndex < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </pre>
  );
});
