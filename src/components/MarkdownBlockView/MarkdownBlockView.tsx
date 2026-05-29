import { createElement } from "react";
import { type DocumentDirection, type Theme } from "../../types";
import { MarkdownBlock } from "../../markdown/types";
import { HighlightedCodeBlock } from "../HighlightedCodeBlock";
import { renderInlineMarkdown } from "../../markdown/renderInlineMarkdown";

type MarkdownBlockViewProps = {
  block: MarkdownBlock;
  currentLine: number;
  theme: Theme;
  direction: DocumentDirection;
};

function isLineInsideBlock(block: MarkdownBlock, line: number) {
  return line >= block.source.startLine && line <= block.source.endLine;
}

export function MarkdownBlockView({
  block,
  currentLine,
  theme,
  direction,
}: MarkdownBlockViewProps) {
  const isActiveBlock = isLineInsideBlock(block, currentLine);
  const blockClassName = isActiveBlock ? "active-preview-block" : undefined;

  if (block.type === "heading") {
    return createElement(
      `h${block.level}`,
      { className: blockClassName, dir: direction },
      renderInlineMarkdown(block.text),
    );
  }

  if (block.type === "paragraph") {
    return (
      <p className={blockClassName} dir={direction}>
        {renderInlineMarkdown(block.text)}
      </p>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote className={blockClassName} dir={direction}>
        {renderInlineMarkdown(block.text)}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";

    return (
      <List dir={direction}>
        {block.items.map((item, index) => (
          <li
            key={index}
            className={item.line === currentLine ? "active-preview-line" : undefined}
          >
            {renderInlineMarkdown(item.text)}
          </li>
        ))}
      </List>
    );
  }

  return (
    <HighlightedCodeBlock
      code={block.code}
      language={block.language}
      isActive={Boolean(blockClassName)}
      theme={theme}
    />
  );
}
