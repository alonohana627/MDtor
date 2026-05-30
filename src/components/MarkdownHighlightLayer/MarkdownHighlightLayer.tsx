import { type CSSProperties, forwardRef, useMemo } from "react";
import {
  createMarkdownHighlightIndex,
  getMarkdownHighlightLineCount,
  highlightMarkdownRange,
  type MarkdownHighlightIndex,
} from "../../markdown/highlightMarkdown";

type MarkdownHighlightLayerProps = {
  markdown?: string;
  highlightIndex?: MarkdownHighlightIndex;
  scrollTop?: number;
  viewportHeight?: number;
};

const EDITOR_LINE_HEIGHT = 24;
const DEFAULT_VIEWPORT_HEIGHT = 720;
const OVERSCAN_LINES = 16;

export const MarkdownHighlightLayer = forwardRef<
  HTMLPreElement,
  MarkdownHighlightLayerProps
>(function MarkdownHighlightLayer(
  {
    markdown = "",
    highlightIndex,
    scrollTop = 0,
    viewportHeight = DEFAULT_VIEWPORT_HEIGHT,
  },
  ref,
) {
  const index = useMemo(
    () => highlightIndex ?? createMarkdownHighlightIndex(markdown),
    [highlightIndex, markdown],
  );
  const lineCount = getMarkdownHighlightLineCount(index);
  const firstVisibleLine = Math.floor(scrollTop / EDITOR_LINE_HEIGHT) + 1;
  const firstRenderedLine = Math.max(1, firstVisibleLine - OVERSCAN_LINES);
  const renderedLineCount =
    Math.ceil((viewportHeight || DEFAULT_VIEWPORT_HEIGHT) / EDITOR_LINE_HEIGHT) +
    OVERSCAN_LINES * 2;
  const lastRenderedLine = Math.min(lineCount, firstRenderedLine + renderedLineCount - 1);
  const lines = useMemo(
    () => highlightMarkdownRange(index, firstRenderedLine, lastRenderedLine),
    [index, firstRenderedLine, lastRenderedLine],
  );
  const spacerStyle = {
    "--highlight-content-height": `${lineCount * EDITOR_LINE_HEIGHT}px`,
    "--highlight-window-offset": `${(firstRenderedLine - 1) * EDITOR_LINE_HEIGHT}px`,
  } as CSSProperties;

  return (
    <pre ref={ref} className="markdown-highlight-layer" aria-hidden="true">
      <span className="highlight-virtual-spacer" style={spacerStyle}>
        <span className="highlight-window">
          {lines.map((line, lineIndex) => (
            <span className="highlight-line" key={firstRenderedLine + lineIndex}>
              {line.map((token, tokenIndex) => (
                <span className={`md-token md-token-${token.type}`} key={tokenIndex}>
                  {token.text}
                </span>
              ))}
            </span>
          ))}
        </span>
      </span>
    </pre>
  );
});
