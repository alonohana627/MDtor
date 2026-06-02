import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExportHtmlElement,
  createExportHtmlElementFromDocuments,
  markdownDocumentsToDocxBytes,
  markdownDocumentsToPdfBytes,
  markdownDocumentsToStandaloneHtml,
  markdownToDocxBytes,
  markdownToPdfBytes,
  markdownToStandaloneHtml,
} from "../../../src/markdown/exportMarkdown";

const html2PdfWorker = vi.hoisted(() => ({
  set: vi.fn(),
  from: vi.fn(),
  toPdf: vi.fn(),
  outputPdf: vi.fn(),
}));

vi.mock("html2pdf.js", () => ({
  default: vi.fn(() => html2PdfWorker),
}));

async function readDocxXml(bytes: Uint8Array, path: string) {
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file(path);

  if (!file) {
    throw new Error(`Missing DOCX part ${path}.`);
  }

  return file.async("string");
}

describe("exportMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    html2PdfWorker.set.mockReturnValue(html2PdfWorker);
    html2PdfWorker.from.mockReturnValue(html2PdfWorker);
    html2PdfWorker.toPdf.mockReturnValue(html2PdfWorker);
    html2PdfWorker.outputPdf.mockResolvedValue(
      new TextEncoder().encode("%PDF-1.4\npreview-pdf").buffer,
    );
  });

  it("builds standalone export HTML from the same rendered preview structure", () => {
    const html = markdownToStandaloneHtml(
      "# Title\n\nשלום עולם\n\n- one\n- two\n\n```ts\nconst x = 1;\n```",
      "Article",
      "rtl",
    );
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.querySelector("article")?.getAttribute("dir")).toBe("rtl");
    expect(document.querySelector("h1")?.textContent).toBe("Title");
    expect(document.querySelector("ul")?.textContent).toContain("one");
    expect(document.querySelector("pre code")?.classList.contains("language-ts")).toBe(
      true,
    );
    expect(document.querySelector("pre code")?.textContent).toContain("const x = 1;");
    expect(html).toContain("@page { size: A4");
    expect(html).not.toContain("# Title");
  });

  it("builds multi-document standalone HTML with real print page breaks", () => {
    const html = markdownDocumentsToStandaloneHtml(
      [
        { relativePath: "b.md", markdown: "# B\n\nSecond" },
        { relativePath: "c.md", markdown: "# C\n\nThird" },
      ],
      "Book",
      "ltr",
    );
    const document = new DOMParser().parseFromString(html, "text/html");
    const sections = document.querySelectorAll(".export-file");

    expect(sections).toHaveLength(2);
    expect(sections[0].classList.contains("export-file-page-break")).toBe(false);
    expect(sections[1].classList.contains("export-file-page-break")).toBe(true);
    expect(sections[0].querySelector("h1")?.textContent).toBe("B");
    expect(sections[1].querySelector("h1")?.textContent).toBe("C");
    expect(html).toContain("break-before: page");
    expect(html).toContain("page-break-before: always");
  });

  it("creates a hidden export element for PDF rendering", () => {
    const element = createExportHtmlElement("# Title", "Article", "ltr");

    expect(element).toHaveAttribute("dir", "ltr");
    expect(element.dataset.exportTitle).toBe("Article");
    expect(element.querySelector("h1")?.textContent).toBe("Title");
    expect(element.querySelector("style")?.textContent).toContain("@page");
  });

  it("creates hidden multi-document export elements for PDF rendering", () => {
    const element = createExportHtmlElementFromDocuments(
      [
        { relativePath: "a.md", markdown: "# A" },
        { relativePath: "b.md", markdown: "# B" },
      ],
      "Book",
      "rtl",
    );

    expect(element).toHaveAttribute("dir", "rtl");
    expect(element.querySelectorAll(".export-file")).toHaveLength(2);
    expect(element.querySelectorAll(".export-file-page-break")).toHaveLength(1);
  });

  it("renders PDF bytes through html2pdf with A4 pagination options", async () => {
    const bytes = await markdownToPdfBytes("# Title", "Article", "rtl");

    expect(new TextDecoder().decode(bytes)).toContain("%PDF-1.4");
    expect(html2PdfWorker.set).toHaveBeenCalledWith(
      expect.objectContaining({
        margin: 0.75,
        jsPDF: expect.objectContaining({ format: "a4", orientation: "portrait" }),
        pagebreak: expect.objectContaining({
          avoid: expect.arrayContaining(["h1", "pre", "blockquote", "li"]),
        }),
      }),
    );
    expect(html2PdfWorker.from).toHaveBeenCalledWith(
      expect.objectContaining({ dir: "rtl" }),
    );
    expect((html2PdfWorker.from.mock.calls[0][0] as HTMLElement).style.direction).toBe(
      "rtl",
    );
    expect((html2PdfWorker.from.mock.calls[0][0] as HTMLElement).style.textAlign).toBe(
      "right",
    );
  });

  it("renders multi-document PDF bytes from one paginated export element", async () => {
    const bytes = await markdownDocumentsToPdfBytes(
      [
        { relativePath: "a.md", markdown: "# A" },
        { relativePath: "b.md", markdown: "# B" },
      ],
      "Book",
      "ltr",
    );

    expect(new TextDecoder().decode(bytes)).toContain("%PDF-1.4");
    expect(html2PdfWorker.from).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset: expect.objectContaining({ exportTitle: "Book" }),
      }),
    );
  });

  it("creates editable DOCX content with headings, lists, links, RTL text, and code", async () => {
    const bytes = await markdownToDocxBytes(
      "# Title\n\nשלום עולם\n\n- one\n- two\n\n> Quote\n\nParagraph with **bold**, *italic*, `code`, and [link](https://example.com).\n\n```ts\nconst x = 1;\n```",
      "rtl",
    );
    const documentXml = await readDocxXml(bytes, "word/document.xml");
    const relsXml = await readDocxXml(bytes, "word/_rels/document.xml.rels");
    const numberingXml = await readDocxXml(bytes, "word/numbering.xml");
    const settingsXml = await readDocxXml(bytes, "word/settings.xml");
    const stylesXml = await readDocxXml(bytes, "word/styles.xml");

    expect(documentXml).toContain("Title");
    expect(documentXml).toContain("שלום עולם");
    expect(documentXml).toContain("Heading1");
    expect(documentXml).toContain("QuoteRtl");
    expect(documentXml).toContain("CodeBlock");
    expect(documentXml).toContain("const");
    expect(documentXml).toContain(" x = ");
    expect(documentXml).toContain("1");
    expect(documentXml).toContain(";");
    expect(documentXml).toContain("<w:b/>");
    expect(documentXml).toContain("<w:i/>");
    expect(documentXml).toContain("<w:bidi/>");
    expect(documentXml).toContain("<w:sectPr");
    expect(documentXml).toContain("<w:rtlGutter/>");
    expect(documentXml).toContain('<w:jc w:val="start"/>');
    expect(documentXml).not.toContain("<w:pPr><w:bidi/><w:pStyle");
    expect(documentXml).toMatch(
      /<w:pPr><w:pStyle w:val="Heading1"\/><w:bidi\/>[\s\S]*?<w:jc w:val="start"\/>[\s\S]*?<\/w:pPr>/,
    );
    expect(documentXml).toContain("<w:rtl/>");
    expect(documentXml).toContain("<w:cs/>");
    expect(documentXml).toContain('w:bidi="he-IL"');
    expect(documentXml).toContain("<w:hyperlink");
    expect(relsXml).toContain('Target="https://example.com"');
    expect(documentXml).toContain("<w:numPr>");
    expect(numberingXml).toContain('w:val="start"');
    expect(numberingXml).toContain("<w:ind");
    expect(numberingXml).toContain('w:right="720"');
    expect(numberingXml).toContain('w:start="720"');
    expect(numberingXml).not.toContain('w:left="720"');
    expect(numberingXml).toContain('<w:numFmt w:val="bullet"');
    expect(settingsXml).toContain('w:bidi="he-IL"');
    expect(stylesXml).toContain('w:styleId="Normal"');
    expect(stylesXml).toContain("<w:bidi/>");
    expect(stylesXml).toContain('<w:jc w:val="start"/>');
    expect(stylesXml).toContain("<w:rtl/>");
    expect(stylesXml).toContain("<w:cs/>");
    expect(stylesXml).toContain('w:bidi="he-IL"');
  });

  it("creates DOCX blockquotes, ordered lists, soft breaks, highlighted code, and empty documents", async () => {
    const bytes = await markdownToDocxBytes(
      [
        "## Subtitle",
        "",
        "> Quoted text",
        "",
        "1. first",
        "2. second",
        "",
        "Line one",
        "Line two",
        "",
        "```html",
        '<div class="box">Text</div>',
        "```",
      ].join("\n"),
      "ltr",
    );
    const documentXml = await readDocxXml(bytes, "word/document.xml");
    const numberingXml = await readDocxXml(bytes, "word/numbering.xml");

    expect(documentXml).toContain("Heading2");
    expect(documentXml).toContain("Quote");
    expect(documentXml).toContain("Quoted text");
    expect(documentXml).toContain("<w:br");
    expect(documentXml).toContain("CodeBlock");
    expect(numberingXml).toContain('<w:numFmt w:val="decimal"');

    const emptyDocumentXml = await readDocxXml(
      await markdownToDocxBytes("", "ltr"),
      "word/document.xml",
    );

    expect(emptyDocumentXml).toContain("<w:p>");
  });

  it("creates DOCX page breaks between exported Markdown files", async () => {
    const bytes = await markdownDocumentsToDocxBytes(
      [
        { relativePath: "a.md", markdown: "# A\n\nFirst" },
        { relativePath: "b.md", markdown: "# B\n\nSecond" },
        { relativePath: "c.md", markdown: "# C\n\nThird" },
      ],
      "ltr",
    );
    const documentXml = await readDocxXml(bytes, "word/document.xml");

    expect(documentXml).toContain("A");
    expect(documentXml).toContain("B");
    expect(documentXml).toContain("C");
    expect(documentXml.match(/w:type="page"/g)).toHaveLength(2);
    expect(documentXml.indexOf("First")).toBeLessThan(documentXml.indexOf("Second"));
    expect(documentXml.indexOf("Second")).toBeLessThan(documentXml.indexOf("Third"));
  });

  it("keeps unsafe DOCX links inert", async () => {
    const unsafeDocumentXml = await readDocxXml(
      await markdownToDocxBytes("[Bad](javascript:alert)\n\n[Relative](notes.md)", "ltr"),
      "word/document.xml",
    );
    const mailtoBytes = await markdownToDocxBytes("[](mailto:test@example.com)", "ltr");
    const mailtoDocumentXml = await readDocxXml(mailtoBytes, "word/document.xml");
    const relsXml = await readDocxXml(mailtoBytes, "word/_rels/document.xml.rels");

    expect(unsafeDocumentXml).toContain("Bad");
    expect(unsafeDocumentXml).toContain("Relative");
    expect(unsafeDocumentXml).not.toContain("<w:hyperlink");
    expect(unsafeDocumentXml).not.toContain("javascript:alert");
    expect(unsafeDocumentXml).not.toContain("notes.md");
    expect(mailtoDocumentXml).toContain("<w:hyperlink");
    expect(mailtoDocumentXml).toContain("mailto:test@example.com");
    expect(relsXml).toContain('Target="mailto:test@example.com"');
  });
});
