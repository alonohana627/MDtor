import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownPreview } from "../../../src/components/MarkdownPreview";

describe("MarkdownPreview", () => {
  it("renders an empty preview message when there is no rendered HTML", () => {
    render(<MarkdownPreview markdown="" direction="ltr" currentLine={1} />);

    expect(screen.getByText("Nothing to preview yet.")).toHaveClass("empty-preview");
  });

  it("renders sanitized markdown HTML", () => {
    render(
      <MarkdownPreview
        markdown={"# Title\n\nParagraph with **bold** and [link](https://example.com)."}
        direction="ltr"
        currentLine={1}
      />,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "link" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("applies document direction to the preview root", () => {
    const { container } = render(
      <MarkdownPreview markdown="# כותרת" direction="rtl" currentLine={1} />,
    );

    expect(container.querySelector(".markdown-preview")).toHaveAttribute("dir", "rtl");
  });

  it("keeps code blocks in the code styling target", () => {
    const { container } = render(
      <MarkdownPreview
        markdown={"```ts\nconst value = 1;\n```"}
        direction="rtl"
        currentLine={1}
      />,
    );

    expect(container.querySelector("pre code")).toHaveClass("language-ts");
  });

  it("marks the rendered block that contains the current editor line", () => {
    const { container, rerender } = render(
      <MarkdownPreview
        markdown={"# Title\n\nFirst paragraph.\n\nSecond paragraph."}
        direction="ltr"
        currentLine={3}
      />,
    );

    expect(container.querySelector(".active-preview")?.textContent).toBe(
      "First paragraph.",
    );

    rerender(
      <MarkdownPreview
        markdown={"# Title\n\nFirst paragraph.\n\nSecond paragraph."}
        direction="ltr"
        currentLine={5}
      />,
    );

    expect(container.querySelector(".active-preview")?.textContent).toBe(
      "Second paragraph.",
    );
  });
});
