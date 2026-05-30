import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownBlockView } from "../../../src/components/MarkdownBlockView";
import { MarkdownBlock } from "../../../src/markdown/types";

vi.mock("../../../src/components/HighlightedCodeBlock", () => ({
  HighlightedCodeBlock: ({
    code,
    language,
    blockIndex,
  }: {
    code: string;
    language: string;
    blockIndex?: number;
  }) => (
    <pre data-block-index={blockIndex}>
      <span>{language}</span>
      <code>{code}</code>
    </pre>
  ),
}));

describe("MarkdownBlockView", () => {
  it("renders a heading block with source metadata", () => {
    const block: MarkdownBlock = {
      type: "heading",
      level: 2,
      text: "Heading",
      source: { startLine: 3, endLine: 3 },
    };

    render(
      <MarkdownBlockView block={block} blockIndex={7} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByRole("heading", { name: "Heading", level: 2 })).toHaveAttribute(
      "data-block-index",
      "7",
    );
  });

  it("renders paragraph inline markdown", () => {
    const block: MarkdownBlock = {
      type: "paragraph",
      text: "This is **bold**",
      source: { startLine: 1, endLine: 1 },
    };

    render(
      <MarkdownBlockView block={block} blockIndex={0} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByText("bold")).toHaveTextContent("bold");
    expect(screen.getByText("bold").tagName.toLowerCase()).toBe("strong");
  });

  it("renders list item source lines for preview highlighting", () => {
    const block: MarkdownBlock = {
      type: "list",
      ordered: false,
      items: [
        { text: "one", line: 1 },
        { text: "two", line: 2 },
      ],
      source: { startLine: 1, endLine: 2 },
    };

    render(
      <MarkdownBlockView block={block} blockIndex={0} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByText("one")).toHaveAttribute("data-source-line", "1");
    expect(screen.getByText("two")).toHaveAttribute("data-source-line", "2");
  });

  it("renders blockquotes", () => {
    const block: MarkdownBlock = {
      type: "blockquote",
      text: "quoted",
      source: { startLine: 1, endLine: 1 },
    };

    render(
      <MarkdownBlockView block={block} blockIndex={0} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByText("quoted")).toHaveAttribute("data-source-start-line", "1");
  });

  it("delegates code blocks to the highlighted code block renderer", () => {
    const block: MarkdownBlock = {
      type: "code",
      language: "ts",
      code: "const value = 1;",
      source: { startLine: 1, endLine: 3 },
    };

    render(
      <MarkdownBlockView block={block} blockIndex={3} theme="dark" direction={"ltr"} />,
    );

    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByText("const value = 1;")).toBeInTheDocument();
    expect(screen.getByText("const value = 1;").closest("pre")).toHaveAttribute(
      "data-block-index",
      "3",
    );
  });
});
