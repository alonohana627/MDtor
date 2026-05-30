import { createElement } from "react";
import { type DocumentDirection, type Theme } from "../../types";
import { MarkdownBlock } from "../../markdown/types";
import { HighlightedCodeBlock } from "../HighlightedCodeBlock";
import { renderInlineMarkdown } from "../../markdown/renderInlineMarkdown";

type MarkdownBlockViewProps = {
  block: MarkdownBlock;
  blockIndex: number;
  theme: Theme;
  direction: DocumentDirection;
  loadImage?: (src: string) => Promise<Blob>;
};

function sourceLineProps(line: number) {
  return { "data-source-line": line };
}

function sourceRangeProps(block: MarkdownBlock, blockIndex: number) {
  return {
    "data-block-index": blockIndex,
    "data-source-start-line": block.source.startLine,
    "data-source-end-line": block.source.endLine,
  };
}

export function MarkdownBlockView({
  block,
  blockIndex,
  theme,
  direction,
  loadImage,
}: MarkdownBlockViewProps) {
  if (block.type === "heading") {
    return createElement(
      `h${block.level}`,
      {
        dir: direction,
        ...sourceRangeProps(block, blockIndex),
        ...sourceLineProps(block.source.startLine),
      },
      renderInlineMarkdown(block.text, { loadImage }),
    );
  }

  if (block.type === "paragraph") {
    return (
      <p
        dir={direction}
        {...sourceRangeProps(block, blockIndex)}
        {...sourceLineProps(block.source.startLine)}
      >
        {renderInlineMarkdown(block.text, { loadImage })}
      </p>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        dir={direction}
        {...sourceRangeProps(block, blockIndex)}
        {...sourceLineProps(block.source.startLine)}
      >
        {renderInlineMarkdown(block.text, { loadImage })}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";

    return (
      <List dir={direction} {...sourceRangeProps(block, blockIndex)}>
        {block.items.map((item, index) => (
          <li key={index} {...sourceLineProps(item.line)}>
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
      theme={theme}
      sourceLine={block.source.startLine}
      blockIndex={blockIndex}
      sourceStartLine={block.source.startLine}
      sourceEndLine={block.source.endLine}
    />
  );
}
