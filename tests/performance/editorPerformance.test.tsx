import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MarkdownEditor } from "../../src/components/MarkdownEditor";

function makeLargeDocument(lineCount: number) {
  return Array.from(
    { length: lineCount },
    (_, index) =>
      `# Heading ${index + 1}\nParagraph ${index + 1} with **bold**, *italic*, [link](https://example.com), and \`code\`.`,
  ).join("\n");
}

describe("large document editor performance", () => {
  test("renders a large CodeMirror editor", () => {
    const markdown = makeLargeDocument(3000);
    const { container } = render(
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

    expect(container.querySelector(".cm-editor")).not.toBeNull();
  });
});
