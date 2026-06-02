import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExportHtmlElement,
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

  it("creates a hidden export element for PDF rendering", () => {
    const element = createExportHtmlElement("# Title", "Article", "ltr");

    expect(element).toHaveAttribute("dir", "ltr");
    expect(element.dataset.exportTitle).toBe("Article");
    expect(element.querySelector("h1")?.textContent).toBe("Title");
    expect(element.querySelector("style")?.textContent).toContain("@page");
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
  });

  it("creates editable DOCX content with headings, lists, links, RTL text, and code", async () => {
    const bytes = await markdownToDocxBytes(
      "# Title\n\nשלום עולם\n\n- one\n- two\n\nParagraph with **bold**, *italic*, `code`, and [link](https://example.com).\n\n```ts\nconst x = 1;\n```",
      "rtl",
    );
    const documentXml = await readDocxXml(bytes, "word/document.xml");
    const relsXml = await readDocxXml(bytes, "word/_rels/document.xml.rels");
    const numberingXml = await readDocxXml(bytes, "word/numbering.xml");

    expect(documentXml).toContain("Title");
    expect(documentXml).toContain("שלום עולם");
    expect(documentXml).toContain("Heading1");
    expect(documentXml).toContain("CodeBlock");
    expect(documentXml).toContain("const");
    expect(documentXml).toContain(" x = ");
    expect(documentXml).toContain("1");
    expect(documentXml).toContain(";");
    expect(documentXml).toContain("<w:b/>");
    expect(documentXml).toContain("<w:i/>");
    expect(documentXml).toContain("<w:bidi/>");
    expect(documentXml).toContain("<w:hyperlink");
    expect(relsXml).toContain('Target="https://example.com"');
    expect(documentXml).toContain("<w:numPr>");
    expect(numberingXml).toContain('<w:numFmt w:val="bullet"');
  });

  it("keeps unsafe DOCX links inert", async () => {
    const documentXml = await readDocxXml(
      await markdownToDocxBytes("[Bad](javascript:alert)", "ltr"),
      "word/document.xml",
    );

    expect(documentXml).toContain("Bad");
    expect(documentXml).not.toContain("<w:hyperlink");
    expect(documentXml).not.toContain("javascript:alert");
  });
});
