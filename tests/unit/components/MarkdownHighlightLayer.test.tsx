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
});
