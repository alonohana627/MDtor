import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { type DocumentDirection, type Theme } from "../../types";
import { parseMarkdown } from "../../markdown/parseMarkdown";
import { type MarkdownBlock } from "../../markdown/types";
import { MarkdownBlockView } from "../MarkdownBlockView";
import "./MarkdownPreview.css";

type MarkdownPreviewProps = {
  markdown: string;
  blocks?: MarkdownBlock[];
  currentLine: number;
  theme: Theme;
  direction: DocumentDirection;
  loadImage?: (src: string) => Promise<Blob>;
};

const ACTIVE_BLOCK_CLASS = "active-preview-block";
const ACTIVE_LINE_CLASS = "active-preview-line";

type ActivePreviewElements = {
  block: Element | null;
  line: Element | null;
};

type MarkdownPreviewContentProps = {
  blocks: MarkdownBlock[];
  theme: Theme;
  direction: DocumentDirection;
  loadImage?: (src: string) => Promise<Blob>;
};

function findActiveBlockIndex(blocks: MarkdownBlock[], currentLine: number) {
  let low = 0;
  let high = blocks.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const block = blocks[middle];

    if (currentLine < block.source.startLine) {
      high = middle - 1;
    } else if (currentLine > block.source.endLine) {
      low = middle + 1;
    } else {
      return middle;
    }
  }

  return -1;
}

function clearActivePreviewElements(activeElements: ActivePreviewElements) {
  activeElements.block?.classList.remove(ACTIVE_BLOCK_CLASS);
  activeElements.line?.classList.remove(ACTIVE_LINE_CLASS);
  activeElements.block = null;
  activeElements.line = null;
}

const MarkdownPreviewContent = memo(function MarkdownPreviewContent({
  blocks,
  theme,
  direction,
  loadImage,
}: MarkdownPreviewContentProps) {
  return (
    <>
      {blocks.map((block, index) => (
        <MarkdownBlockView
          key={index}
          block={block}
          blockIndex={index}
          theme={theme}
          direction={direction}
          loadImage={loadImage}
        />
      ))}
    </>
  );
});

export const MarkdownPreview = memo(function MarkdownPreview({
  markdown,
  blocks,
  currentLine,
  theme,
  direction,
  loadImage,
}: MarkdownPreviewProps) {
  const previewContentRef = useRef<HTMLDivElement>(null);
  const activeElementsRef = useRef<ActivePreviewElements>({
    block: null,
    line: null,
  });
  const parsedBlocks = useMemo(
    () => blocks ?? parseMarkdown(markdown),
    [blocks, markdown],
  );

  useLayoutEffect(() => {
    const previewContent = previewContentRef.current;

    clearActivePreviewElements(activeElementsRef.current);

    if (!previewContent || parsedBlocks.length === 0) {
      return;
    }

    const activeBlockIndex = findActiveBlockIndex(parsedBlocks, currentLine);

    if (activeBlockIndex === -1) {
      return;
    }

    const activeBlock = parsedBlocks[activeBlockIndex];
    const blockElement = previewContent.children.item(activeBlockIndex);

    if (!blockElement) {
      return;
    }

    if (activeBlock.type === "list") {
      const activeItemIndex = activeBlock.items.findIndex(
        (item) => item.line === currentLine,
      );
      const activeLineElement =
        activeItemIndex === -1 ? null : blockElement.children.item(activeItemIndex);

      activeLineElement?.classList.add(ACTIVE_LINE_CLASS);
      activeElementsRef.current.line = activeLineElement;
      return;
    }

    blockElement.classList.add(ACTIVE_BLOCK_CLASS);
    activeElementsRef.current.block = blockElement;
  }, [parsedBlocks, currentLine]);

  if (parsedBlocks.length === 0) {
    return <p className="empty-preview">Nothing to preview yet.</p>;
  }

  return (
    <div ref={previewContentRef} className="preview-content">
      <MarkdownPreviewContent
        blocks={parsedBlocks}
        theme={theme}
        direction={direction}
        loadImage={loadImage}
      />
    </div>
  );
});
