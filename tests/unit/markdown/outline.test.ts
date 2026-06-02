import { describe, expect, it } from "vitest";
import { getActiveOutlineItem, getMarkdownOutline } from "../../../src/markdown/outline";

describe("outline helpers", () => {
  it("extracts heading hierarchy with stable duplicate ids", () => {
    const outline = getMarkdownOutline(
      "# Intro\n\n## Intro\n\n### Details\n\n#### `Code` and ![Image text](image.png)",
    );

    expect(outline).toEqual([
      { id: "intro", level: 1, text: "Intro", line: 1 },
      { id: "intro-2", level: 2, text: "Intro", line: 3 },
      { id: "details", level: 3, text: "Details", line: 5 },
      {
        id: "code-and-image-text-image-png",
        level: 4,
        text: "Code and ![Image text](image.png)",
        line: 7,
      },
    ]);
  });

  it("returns the active heading for the current line", () => {
    const outline = getMarkdownOutline("# One\n\nText\n\n## Two");

    expect(getActiveOutlineItem(outline, 4)?.text).toBe("One");
    expect(getActiveOutlineItem(outline, 5)?.text).toBe("Two");
    expect(getActiveOutlineItem(outline, 0)).toBeNull();
  });
});
