import { escapeHtml } from "../codeHighlighting";
import {
  exportStyleContract,
  getExportDirection,
  type ExportDocumentDirection,
} from "./styles";
import { renderMarkdownToHtml } from "../markdownRenderer";
import { type MarkdownExportDocument } from "./types";

export function markdownToStandaloneHtml(
  markdown: string,
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  return markdownDocumentsToStandaloneHtml(
    [{ relativePath: title, markdown }],
    title,
    direction,
  );
}

export function markdownDocumentsToStandaloneHtml(
  documents: MarkdownExportDocument[],
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  const exportDirection = getExportDirection(direction);
  const body = renderMarkdownDocumentSections(documents);

  return `<!doctype html>
<html lang="en" dir="${exportDirection}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${getExportCss(exportDirection)}</style>
</head>
<body>
  <article class="markdown-preview export-document" dir="${exportDirection}">
${body}
  </article>
</body>
</html>
`;
}

export function createExportHtmlElement(
  markdown: string,
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  return createExportHtmlElementFromDocuments(
    [{ relativePath: title, markdown }],
    title,
    direction,
  );
}

export function createExportHtmlElementFromDocuments(
  documents: MarkdownExportDocument[],
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  const documentHtml = markdownDocumentsToStandaloneHtml(documents, title, direction);
  const parsedDocument = new DOMParser().parseFromString(documentHtml, "text/html");
  const article = parsedDocument.querySelector("article");
  const exportElement = document.createElement("article");

  exportElement.className = "markdown-preview export-document";
  exportElement.dir = getExportDirection(direction);
  exportElement.style.direction = getExportDirection(direction);
  exportElement.style.textAlign = direction === "rtl" ? "right" : "left";
  exportElement.dataset.exportTitle = title;
  exportElement.innerHTML = article?.innerHTML ?? "";
  exportElement.append(createExportStyleElement(direction));

  return exportElement;
}

function renderMarkdownDocumentSections(documents: MarkdownExportDocument[]) {
  const exportDocuments =
    documents.length > 0 ? documents : [{ relativePath: "untitled.md", markdown: "" }];

  return exportDocuments
    .map((document, index) => {
      const body =
        renderMarkdownToHtml(document.markdown) ||
        '<p class="empty-preview">Nothing to preview yet.</p>';
      const pageBreakClass = index > 0 ? " export-file-page-break" : "";

      return `    <section class="export-file${pageBreakClass}" data-export-file="${escapeHtml(
        document.relativePath,
      )}">
${body}
    </section>`;
    })
    .join("\n");
}

function createExportStyleElement(direction: ExportDocumentDirection) {
  const style = document.createElement("style");

  style.textContent = getExportCss(getExportDirection(direction));

  return style;
}

function getExportCss(direction: ExportDocumentDirection) {
  const textAlign = direction === "rtl" ? "right" : "left";
  const listPadding =
    direction === "rtl" ? "padding-right: 1.55rem;" : "padding-left: 1.55rem;";
  const listReset = direction === "rtl" ? "padding-left: 0;" : "padding-right: 0;";
  const quoteBorder =
    direction === "rtl"
      ? `border-right: 4px solid ${exportStyleContract.colors.muted}; border-left: 0;`
      : `border-left: 4px solid ${exportStyleContract.colors.muted}; border-right: 0;`;

  return `
    @page { size: ${exportStyleContract.page.size}; margin: ${exportStyleContract.page.margin}; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body {
      color: ${exportStyleContract.colors.text};
      font-family: ${exportStyleContract.fontFamily};
      font-size: 12pt;
      line-height: 1.65;
      direction: ${direction};
      text-align: ${textAlign};
    }
    .export-document {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      direction: ${direction};
      text-align: ${textAlign};
    }
    .export-file {
      break-inside: auto;
      page-break-inside: auto;
      direction: ${direction};
      text-align: ${textAlign};
    }
    .export-file-page-break {
      break-before: page;
      page-break-before: always;
    }
    .export-file > :first-child { margin-top: 0; }
    .export-file > :last-child { margin-bottom: 0; }
    .export-document > :first-child { margin-top: 0; }
    .export-document > :last-child { margin-bottom: 0; }
    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      page-break-after: avoid;
      margin: 1.35em 0 0.55em;
      color: ${exportStyleContract.colors.textStrong};
      font-family: ${exportStyleContract.headingFontFamily};
      line-height: 1.2;
    }
    h1 {
      border-bottom: 1px solid ${exportStyleContract.colors.border};
      padding-bottom: 0.25em;
      font-size: 2rem;
    }
    h2 {
      border-bottom: 1px solid ${exportStyleContract.colors.border};
      padding-bottom: 0.2em;
      font-size: 1.45rem;
    }
    h3 { font-size: 1.18rem; }
    p { margin: 0 0 1em; }
    a {
      color: ${exportStyleContract.colors.link};
      text-decoration-thickness: 0.08em;
      text-underline-offset: 0.15em;
    }
    ul, ol {
      margin: 0 0 1em;
      ${listPadding}
      ${listReset}
    }
    li {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    li + li { margin-top: 0.2em; }
    blockquote {
      break-inside: avoid;
      page-break-inside: avoid;
      margin: 0 0 1em;
      padding: 0.2em 1em;
      color: ${exportStyleContract.colors.muted};
      ${quoteBorder}
      background: ${exportStyleContract.colors.quoteBackground};
    }
    pre, code, kbd, samp {
      direction: ltr;
      text-align: left;
      unicode-bidi: isolate;
      font-family: ${exportStyleContract.codeFontFamily};
    }
    code {
      border-radius: 5px;
      padding: 0.16em 0.34em;
      background: ${exportStyleContract.colors.codeBackground};
      font-size: 0.9em;
    }
    pre {
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: hidden;
      margin: 0 0 1em;
      border: 1px solid ${exportStyleContract.colors.border};
      border-radius: 8px;
      padding: 16px;
      background: ${exportStyleContract.colors.codeBlockBackground};
      color: ${exportStyleContract.colors.codeBlockText};
      direction: ltr;
      text-align: left;
      unicode-bidi: isolate;
      white-space: pre-wrap;
    }
    pre code {
      display: block;
      padding: 0;
      background: transparent;
      color: inherit;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      margin: 0 0 1em;
      border-collapse: collapse;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid ${exportStyleContract.colors.border};
      padding: 0.4em 0.55em;
      vertical-align: top;
    }
    img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 1rem 0;
    }
    .hljs { color: ${exportStyleContract.colors.codeBlockText}; }
    .hljs-keyword, .hljs-built_in, .hljs-type, .hljs-selector-tag, .hljs-selector-class, .hljs-selector-id { color: ${exportStyleContract.colors.keyword}; }
    .hljs-title, .hljs-section, .hljs-function, .hljs-name { color: ${exportStyleContract.colors.title}; }
    .hljs-string, .hljs-regexp, .hljs-symbol, .hljs-template-variable, .hljs-template-tag, .hljs-addition { color: ${exportStyleContract.colors.string}; }
    .hljs-number, .hljs-literal { color: ${exportStyleContract.colors.number}; }
    .hljs-attr, .hljs-attribute, .hljs-property, .hljs-variable, .hljs-subst, .hljs-deletion { color: ${exportStyleContract.colors.attribute}; }
    .hljs-comment, .hljs-quote { color: ${exportStyleContract.colors.comment}; font-style: italic; }
    .hljs-meta, .hljs-doctag, .hljs-tag { color: ${exportStyleContract.colors.meta}; }
    @media print {
      .export-document { max-width: none; width: 100%; }
    }
  `;
}
