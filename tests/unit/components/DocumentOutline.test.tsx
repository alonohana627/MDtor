import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DocumentOutline } from "../../../src/components/DocumentOutline";

describe("DocumentOutline", () => {
  it("renders headings, highlights the active section, and emits line selection", () => {
    const onSelectLine = vi.fn();

    render(
      <DocumentOutline
        items={[
          { id: "one", level: 1, text: "One", line: 1 },
          { id: "two", level: 2, text: "Two", line: 4 },
        ]}
        currentLine={5}
        onSelectLine={onSelectLine}
      />,
    );

    expect(screen.getByRole("button", { name: "Two" })).toHaveClass("active");

    fireEvent.click(screen.getByRole("button", { name: "One" }));

    expect(onSelectLine).toHaveBeenCalledWith(1);
  });

  it("renders an empty state when no headings exist", () => {
    render(<DocumentOutline items={[]} currentLine={1} onSelectLine={vi.fn()} />);

    expect(screen.getByText("No headings")).toBeInTheDocument();
  });

  it("keeps outline scrolling inside the outline panel", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/components/DocumentOutline/DocumentOutline.css"),
      "utf8",
    );

    expect(css).toMatch(/\.document-outline\s*{[\s\S]*height: 100vh;/);
    expect(css).toMatch(/\.document-outline\s*{[\s\S]*overflow: hidden;/);
    expect(css).toMatch(/\.document-outline nav\s*{[\s\S]*overflow-y: auto;/);
  });
});
