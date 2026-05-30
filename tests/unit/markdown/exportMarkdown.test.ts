import { describe, expect, it } from "vitest";
import {
  markdownToDocxBytes,
  markdownToPdfBytes,
  markdownToStandaloneHtml,
} from "../../../src/markdown/exportMarkdown";

function decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

describe("exportMarkdown", () => {
  it("renders standalone HTML with document styling and Markdown structure", () => {
    const html = markdownToStandaloneHtml(
      "# Title\n\nParagraph with [link](https://example.com) and ![diagram](images/flow.png).\n\n- One\n- Two\n\n> Quote\n\n```ts\nconst x = 1;\n```",
      "Article",
    );

    expect(html).toContain("<title>Article</title>");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain("<ul>");
    expect(html).toContain("<blockquote>Quote</blockquote>");
    expect(html).toContain('<img src="images/flow.png" alt="diagram" />');
    expect(html).toContain('class="language-ts"');
    expect(html).toContain("<style>");
  });

  it("creates a PDF byte stream that includes exported document structure", () => {
    const pdf = markdownToPdfBytes(
      "# Title\n\nParagraph\n\n- First\n\n> Quote\n\n```ts\nconst x = 1;\n```",
      "Article",
    );
    const decoded = decode(pdf);

    expect(decoded.startsWith("%PDF-1.4")).toBe(true);
    expect(decoded).toContain("Article");
    expect(decoded).toContain("# Title");
    expect(decoded).toContain("Paragraph");
    expect(decoded).toContain("- First");
    expect(decoded).toContain("Quote");
    expect(decoded).toContain("const x = 1;");
    expect(decoded).toContain("xref");
  });

  it("creates a DOCX package with document content and hyperlink relationships", () => {
    const docx = markdownToDocxBytes(
      "# Title\n\n1. First\n\nParagraph with [link](https://example.com).\n\n`code`",
    );
    const decoded = decode(docx);

    expect(decoded.startsWith("PK")).toBe(true);
    expect(decoded).toContain("word/document.xml");
    expect(decoded).toContain("word/_rels/document.xml.rels");
    expect(decoded).toContain("Heading1");
    expect(decoded).toContain("First");
    expect(decoded).toContain('<w:hyperlink r:id="rId1"');
    expect(decoded).toContain('Target="https://example.com"');
    expect(decoded).toContain("Code");
  });

  it("keeps unsafe DOCX links inert", () => {
    const decoded = decode(markdownToDocxBytes("[Bad](javascript:alert)"));

    expect(decoded).toContain("<w:t>Bad</w:t>");
    expect(decoded).not.toContain("<w:hyperlink");
    expect(decoded).not.toContain("javascript:alert");
  });
});
