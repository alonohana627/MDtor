import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownBlockView } from "../../../src/components/MarkdownBlockView";
import { MarkdownBlock } from "../../../src/markdown/types";

vi.mock("../../../src/components/HighlightedCodeBlock", () => ({
  HighlightedCodeBlock: ({
    code,
    language,
    isActive,
  }: {
    code: string;
    language: string;
    isActive: boolean;
  }) => (
    <pre className={isActive ? "active-preview-block" : undefined}>
      <span>{language}</span>
      <code>{code}</code>
    </pre>
  ),
}));

describe("MarkdownBlockView", () => {
  it("renders and highlights a heading block", () => {
    const block: MarkdownBlock = {
      type: "heading",
      level: 2,
      text: "Heading",
      source: { startLine: 3, endLine: 3 },
    };

    render(
      <MarkdownBlockView block={block} currentLine={3} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByRole("heading", { name: "Heading", level: 2 })).toHaveClass(
      "active-preview-block",
    );
  });

  it("renders paragraph inline markdown", () => {
    const block: MarkdownBlock = {
      type: "paragraph",
      text: "This is **bold**",
      source: { startLine: 1, endLine: 1 },
    };

    render(
      <MarkdownBlockView
        block={block}
        currentLine={99}
        theme="light"
        direction={"ltr"}
      />,
    );

    expect(screen.getByText("bold")).toHaveTextContent("bold");
    expect(screen.getByText("bold").tagName.toLowerCase()).toBe("strong");
  });

  it("highlights only the active list item", () => {
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
      <MarkdownBlockView block={block} currentLine={2} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByText("one")).not.toHaveClass("active-preview-line");
    expect(screen.getByText("two")).toHaveClass("active-preview-line");
  });

  it("renders blockquotes", () => {
    const block: MarkdownBlock = {
      type: "blockquote",
      text: "quoted",
      source: { startLine: 1, endLine: 1 },
    };

    render(
      <MarkdownBlockView block={block} currentLine={1} theme="light" direction={"ltr"} />,
    );

    expect(screen.getByText("quoted")).toHaveClass("active-preview-block");
  });

  it("delegates code blocks to the highlighted code block renderer", () => {
    const block: MarkdownBlock = {
      type: "code",
      language: "ts",
      code: "const value = 1;",
      source: { startLine: 1, endLine: 3 },
    };

    render(
      <MarkdownBlockView block={block} currentLine={2} theme="dark" direction={"ltr"} />,
    );

    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByText("const value = 1;")).toBeInTheDocument();
    expect(screen.getByText("const value = 1;").closest("pre")).toHaveClass(
      "active-preview-block",
    );
  });
});
