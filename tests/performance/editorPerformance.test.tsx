import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  MarkdownEditor,
  getCurrentLineFromLineStarts,
} from "../../src/components/MarkdownEditor";
import { createMarkdownHighlightIndex } from "../../src/markdown/highlightMarkdown";

function makeLargeDocument(lineCount: number) {
  return Array.from(
    { length: lineCount },
    (_, index) =>
      `# Heading ${index + 1}\nParagraph ${index + 1} with **bold**, *italic*, [link](https://example.com), and \`code\`.`,
  ).join("\n");
}

function measureMs(fn: () => void) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("large document editor performance", () => {
  test("keeps live cursor-line lookup near the end of a large document under budget", () => {
    const markdown = makeLargeDocument(5000);
    const lineStarts = createMarkdownHighlightIndex(markdown).lineStarts;

    getCurrentLineFromLineStarts(lineStarts, markdown.length);

    const ms = measureMs(() => {
      for (let index = 0; index < 100; index += 1) {
        getCurrentLineFromLineStarts(lineStarts, markdown.length);
      }
    });

    expect(ms).toBeLessThan(5);
  });

  test("renders a large editor without creating full-document highlight nodes", () => {
    const markdown = makeLargeDocument(3000);

    const ms = measureMs(() => {
      render(
        <MarkdownEditor
          value={markdown}
          currentLine={1}
          activeFilePath="large.md"
          isDirty={false}
          direction="ltr"
          isSaveDisabled={false}
          isTypewriterMode={false}
          onChange={vi.fn()}
          onCurrentLineChange={vi.fn()}
          onSave={vi.fn()}
          onDirectionChange={vi.fn()}
        />,
      );
    });

    expect(screen.getAllByText("Heading 1").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".highlight-line").length).toBeLessThan(80);
    expect(ms).toBeLessThan(250);
  });
});
