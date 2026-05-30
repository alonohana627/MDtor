import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownPreview } from "../../../src/components/MarkdownPreview";

describe("MarkdownPreview", () => {
  it("renders an empty preview message when there are no blocks", () => {
    render(<MarkdownPreview markdown="" currentLine={1} theme="light" direction="ltr" />);

    expect(screen.getByText("Nothing to preview yet.")).toHaveClass("empty-preview");
  });

  it("renders parsed markdown blocks and highlights the active source line", () => {
    const { rerender } = render(
      <MarkdownPreview
        markdown={"# Title\n\n- one\n- two\n\n> quote"}
        currentLine={4}
        theme="light"
        direction="ltr"
      />,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("one")).not.toHaveClass("active-preview-line");
    expect(screen.getByText("two")).toHaveClass("active-preview-line");
    expect(screen.getByText("quote")).toBeInTheDocument();

    rerender(
      <MarkdownPreview
        markdown={"# Title\n\n- one\n- two\n\n> quote"}
        currentLine={6}
        theme="light"
        direction="ltr"
      />,
    );

    expect(screen.getByText("two")).not.toHaveClass("active-preview-line");
    expect(screen.getByText("quote")).toHaveClass("active-preview-block");
  });

  it("does not mark a preview block when the current line is outside parsed blocks", () => {
    render(
      <MarkdownPreview
        markdown={"# Title\n\nBody"}
        currentLine={99}
        theme="light"
        direction="ltr"
      />,
    );

    expect(screen.getByRole("heading", { name: "Title" })).not.toHaveClass(
      "active-preview-block",
    );
    expect(screen.getByText("Body")).not.toHaveClass("active-preview-block");
  });

  it("marks code blocks as left-to-right when the document is right-to-left", () => {
    const { container } = render(
      <MarkdownPreview
        markdown={"```ts\nconst value = 1;\n```"}
        currentLine={1}
        theme="light"
        direction="rtl"
      />,
    );

    expect(container.querySelector("pre")).toHaveStyle({ direction: "ltr" });
  });
});
