import { createExportHtmlElement, createExportHtmlElementFromDocuments } from "./html";
import { pageMarginInches, type ExportDocumentDirection } from "./styles";
import { type MarkdownExportDocument } from "./types";

export async function markdownToPdfBytes(
  markdown: string,
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  return markdownDocumentsToPdfBytes(
    [{ relativePath: title, markdown }],
    title,
    direction,
  );
}

export async function markdownDocumentsToPdfBytes(
  documents: MarkdownExportDocument[],
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  const { default: html2pdf } = await import("html2pdf.js");
  const host = document.createElement("div");
  const exportElement =
    documents.length === 1
      ? createExportHtmlElement(documents[0].markdown, title, direction)
      : createExportHtmlElementFromDocuments(documents, title, direction);

  host.style.position = "fixed";
  host.style.inset = "0 auto auto 0";
  host.style.width = "210mm";
  host.style.minHeight = "297mm";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";
  host.append(exportElement);
  document.body.append(host);

  try {
    const pdfOptions = {
      margin: pageMarginInches,
      filename: `${title}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      enableLinks: true,
      html2canvas: {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      },
      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait" as const,
      },
      pagebreak: {
        mode: ["css", "legacy"],
        avoid: ["h1", "h2", "h3", "pre", "blockquote", "li", "table"],
      },
    };

    const arrayBuffer = await html2pdf()
      .set(pdfOptions)
      .from(exportElement)
      .toPdf()
      .outputPdf("arraybuffer");

    return new Uint8Array(arrayBuffer);
  } finally {
    host.remove();
  }
}
