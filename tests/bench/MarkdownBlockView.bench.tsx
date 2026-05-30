import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { MarkdownBlockView } from "../../src/components/MarkdownBlockView";
import type { MarkdownBlock } from "../../src/markdown/types";

vi.mock("../../src/components/HighlightedCodeBlock", () => ({
  HighlightedCodeBlock: ({
    code,
    language,
    isActive,
    sourceLine,
  }: {
    code: string;
    language: string;
    isActive: boolean;
    sourceLine?: number;
  }) => (
    <pre
      className={isActive ? "active-preview-block" : undefined}
      data-language={language}
      data-source-line={sourceLine}
    >
      <code>{code}</code>
    </pre>
  ),
}));

const paragraphBlock: MarkdownBlock = {
  type: "paragraph",
  text: "Paragraph with **bold**, *italic*, `code`, and [link](https://example.com).",
  source: {
    startLine: 1,
    endLine: 1,
  },
};

const headingBlock: MarkdownBlock = {
  type: "heading",
  level: 2,
  text: "Heading with **bold**",
  source: {
    startLine: 1,
    endLine: 1,
  },
};

const blockquoteBlock: MarkdownBlock = {
  type: "blockquote",
  text: "Quote with **bold**, *italic*, and `code`.",
  source: {
    startLine: 1,
    endLine: 1,
  },
};

const unorderedListBlock: MarkdownBlock = {
  type: "list",
  ordered: false,
  items: Array.from({ length: 50 }, (_, index) => ({
    text: `Item ${index} with **bold** and \`code\``,
    line: index + 1,
  })),
  source: {
    startLine: 1,
    endLine: 50,
  },
};

const orderedListBlock: MarkdownBlock = {
  type: "list",
  ordered: true,
  items: Array.from({ length: 50 }, (_, index) => ({
    text: `Item ${index} with **bold** and \`code\``,
    line: index + 1,
  })),
  source: {
    startLine: 1,
    endLine: 50,
  },
};

const codeBlock: MarkdownBlock = {
  type: "code",
  language: "typescript",
  code: Array.from(
    { length: 100 },
    (_, index) => `const value${index}: number = ${index};`,
  ).join("\n"),
  source: {
    startLine: 1,
    endLine: 100,
  },
};

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderBlock(block: MarkdownBlock, currentLine = 1) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <MarkdownBlockView
        block={block}
        currentLine={currentLine}
        theme="light"
        direction="ltr"
      />,
    );
  });
}

afterEach(() => {
  for (const root of roots) {
    root.unmount();
  }

  for (const container of containers) {
    container.remove();
  }

  roots = [];
  containers = [];
});

describe("MarkdownBlockView render", () => {
  bench("render paragraph block", () => {
    renderBlock(paragraphBlock);
  });

  bench("render heading block", () => {
    renderBlock(headingBlock);
  });

  bench("render blockquote block", () => {
    renderBlock(blockquoteBlock);
  });

  bench("render 50-item unordered list block", () => {
    renderBlock(unorderedListBlock, 25);
  });

  bench("render 50-item ordered list block", () => {
    renderBlock(orderedListBlock, 25);
  });

  bench("render 100-line code block", () => {
    renderBlock(codeBlock);
  });
});
