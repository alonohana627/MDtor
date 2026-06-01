import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../../../src/markdown/markdownRenderer";

function renderDocument(markdown: string) {
  const container = document.createElement("div");

  container.innerHTML = renderMarkdownToHtml(markdown);

  return container;
}

describe("renderMarkdownToHtml", () => {
  it("renders common Markdown blocks and inline formatting", () => {
    const container = renderDocument(
      [
        "# Title",
        "",
        "Paragraph with **bold**, *italic*, `code`, and [link](https://example.com).",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
        "",
        "> quote",
      ].join("\n"),
    );

    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("h1")).toHaveAttribute("data-source-line", "1");
    expect(container.querySelector("p")?.textContent).toContain("Paragraph");
    expect(container.querySelector("p")).toHaveAttribute("data-source-line", "3");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("p code")?.textContent).toBe("code");
    expect(container.querySelector("a")).toHaveAttribute("href", "https://example.com");
    expect(container.querySelector("ul")?.textContent).toContain("one");
    expect(container.querySelector("ol")?.textContent).toContain("first");
    expect(container.querySelector("blockquote")?.textContent).toContain("quote");
  });

  it("renders fenced code blocks through the code styling target", () => {
    const container = renderDocument("```ts\nconst value = 1;\n```");
    const code = container.querySelector("pre code");

    expect(code).not.toBeNull();
    expect(container.querySelector("pre")).toHaveAttribute("data-source-line", "1");
    expect(code).toHaveClass("hljs");
    expect(code).toHaveClass("language-ts");
    expect(code?.querySelector(".hljs-keyword")).not.toBeNull();
    expect(code?.textContent).toContain("const value = 1;");
  });

  it("escapes unknown fenced code languages instead of injecting raw HTML", () => {
    const container = renderDocument("```unknown\n<script>alert(1)</script>\n```");
    const code = container.querySelector("pre code");

    expect(code?.textContent).toBe("<script>alert(1)</script>\n");
    expect(code?.querySelector("script")).toBeNull();
  });

  it("sanitizes unsafe HTML, handlers, and link protocols", () => {
    const container = renderDocument(
      [
        "<script>alert(1)</script>",
        '<img src="x" onerror="alert(1)">',
        "[bad](javascript:alert(1))",
      ].join("\n"),
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("bad");
  });

  it("renders task lists", () => {
    const container = renderDocument("- [x] done\n- [ ] todo");

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("renders footnotes", () => {
    const container = renderDocument("Text with a note.[^1]\n\n[^1]: Footnote text.");

    expect(container.querySelector(".footnote-ref")).not.toBeNull();
    expect(container.querySelector(".footnotes")?.textContent).toContain(
      "Footnote text.",
    );
  });
});
