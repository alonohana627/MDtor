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
  loadImage?: (src: string) => Promise<Blob>;
};

function isLineInsideBlock(block: MarkdownBlock, line: number) {
  return line >= block.source.startLine && line <= block.source.endLine;
}

function sourceLineProps(line: number) {
  return { "data-source-line": line };
}

export function MarkdownBlockView({
  block,
  currentLine,
  theme,
  direction,
  loadImage,
}: MarkdownBlockViewProps) {
  const isActiveBlock = isLineInsideBlock(block, currentLine);
  const blockClassName = isActiveBlock ? "active-preview-block" : undefined;

  if (block.type === "heading") {
    return createElement(
      `h${block.level}`,
      {
        className: blockClassName,
        dir: direction,
        ...sourceLineProps(block.source.startLine),
      },
      renderInlineMarkdown(block.text, { loadImage }),
    );
  }

  if (block.type === "paragraph") {
    return (
      <p
        className={blockClassName}
        dir={direction}
        {...sourceLineProps(block.source.startLine)}
      >
        {renderInlineMarkdown(block.text, { loadImage })}
      </p>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        className={blockClassName}
        dir={direction}
        {...sourceLineProps(block.source.startLine)}
      >
        {renderInlineMarkdown(block.text, { loadImage })}
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
            {renderInlineMarkdown(item.text, { loadImage })}
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
      sourceLine={block.source.startLine}
    />
  );
}
