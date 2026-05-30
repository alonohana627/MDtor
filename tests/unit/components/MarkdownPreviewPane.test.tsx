import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownPreviewPane } from "../../../src/components/MarkdownPreviewPane";

describe("MarkdownPreviewPane", () => {
  it("renders a preview pane with parsed markdown content", () => {
    render(
      <MarkdownPreviewPane
        markdown="# Rendered title"
        currentLine={1}
        theme="light"
        direction={"ltr"}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Preview", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rendered title", level: 1 })).toHaveClass(
      "active-preview-block",
    );
  });
});
