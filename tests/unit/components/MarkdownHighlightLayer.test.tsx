import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownHighlightLayer } from "../../../src/components/MarkdownHighlightLayer";

describe("MarkdownHighlightLayer", () => {
  it("renders highlighted markdown tokens", () => {
    const ref = createRef<HTMLPreElement>();
    render(<MarkdownHighlightLayer ref={ref} markdown={"# Title\n- item"} />);

    expect(ref.current).toHaveClass("markdown-highlight-layer");
    expect(screen.getByText("#")).toHaveClass("md-token-heading-marker");
    expect(screen.getByText("Title")).toHaveClass("md-token-heading-text");
    expect(ref.current?.querySelector(".md-token-list-marker")).toHaveTextContent("-");
  });

  it("virtualizes large documents to the visible line window", () => {
    const markdown = Array.from(
      { length: 1000 },
      (_, index) => `# Heading ${index + 1}`,
    ).join("\n");
    const { container } = render(
      <MarkdownHighlightLayer markdown={markdown} scrollTop={0} viewportHeight={240} />,
    );

    expect(container.querySelectorAll(".highlight-line").length).toBeLessThan(60);
    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.queryByText("Heading 500")).not.toBeInTheDocument();
  });

  it("moves the rendered window when the editor scrolls", () => {
    const markdown = Array.from(
      { length: 1000 },
      (_, index) => `# Heading ${index + 1}`,
    ).join("\n");

    render(
      <MarkdownHighlightLayer
        markdown={markdown}
        scrollTop={500 * 24}
        viewportHeight={240}
      />,
    );

    expect(screen.queryByText("Heading 1")).not.toBeInTheDocument();
    expect(screen.getByText("Heading 501")).toBeInTheDocument();
  });
});
