import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import type Token from "markdown-it/lib/token.mjs";
import { escapeHtml, highlightCodeToHtml } from "./codeHighlighting";
import { getMarkdownTokens } from "./markdownRendererCore";
import { renderMarkdownToHtml } from "./markdownRenderer";

export type ExportDocumentDirection = "ltr" | "rtl";

const pageMarginInches = 0.75;
const docxPageMargin = convertInchesToTwip(pageMarginInches);
const safeDocxLinkProtocols = new Set(["http:", "https:", "mailto:"]);
const headingStyles = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

export const exportStyleContract = {
  page: {
    size: "A4",
    margin: `${pageMarginInches}in`,
  },
  fontFamily: 'Georgia, "Times New Roman", serif',
  headingFontFamily: '"Aptos", "Segoe UI", Arial, sans-serif',
  codeFontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  colors: {
    text: "#24292f",
    textStrong: "#111827",
    muted: "#68717d",
    border: "#d8dee5",
    quoteBackground: "#f6f8fa",
    codeBackground: "#eaeef2",
    codeBlockBackground: "#0f172a",
    codeBlockText: "#e5e7eb",
    link: "#0969da",
    keyword: "#c4b5fd",
    title: "#93c5fd",
    string: "#86efac",
    number: "#fbbf24",
    attribute: "#fda4af",
    comment: "#94a3b8",
    meta: "#67e8f9",
  },
} as const;

type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
  rightToLeft?: boolean;
};

type DocxRenderContext = {
  direction: ExportDocumentDirection;
};

function getExportDirection(direction: ExportDocumentDirection | undefined) {
  return direction === "rtl" ? "rtl" : "ltr";
}

export function markdownToStandaloneHtml(
  markdown: string,
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  const exportDirection = getExportDirection(direction);
  const body = renderMarkdownToHtml(markdown);

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
${body || '<p class="empty-preview">Nothing to preview yet.</p>'}
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
  const documentHtml = markdownToStandaloneHtml(markdown, title, direction);
  const parsedDocument = new DOMParser().parseFromString(documentHtml, "text/html");
  const article = parsedDocument.querySelector("article");
  const exportElement = document.createElement("article");

  exportElement.className = "markdown-preview export-document";
  exportElement.dir = getExportDirection(direction);
  exportElement.dataset.exportTitle = title;
  exportElement.innerHTML = article?.innerHTML ?? "";
  exportElement.append(createExportStyleElement(direction));

  return exportElement;
}

export async function markdownToPdfBytes(
  markdown: string,
  title = "Document",
  direction: ExportDocumentDirection = "ltr",
) {
  const { default: html2pdf } = await import("html2pdf.js");
  const host = document.createElement("div");
  const exportElement = createExportHtmlElement(markdown, title, direction);

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

export async function markdownToDocxBytes(
  markdown: string,
  direction: ExportDocumentDirection = "ltr",
) {
  const doc = new Document({
    creator: "MDtor",
    description: "Markdown document exported from MDtor",
    styles: createDocxStyles(),
    numbering: {
      config: [
        {
          reference: "mdtor-bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "mdtor-ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: docxPageMargin,
              right: docxPageMargin,
              bottom: docxPageMargin,
              left: docxPageMargin,
            },
          },
        },
        children: renderDocxBlocks(markdown, { direction }),
      },
    ],
  });
  const arrayBuffer = await Packer.toArrayBuffer(doc);

  return new Uint8Array(arrayBuffer);
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
    }
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

function createDocxStyles() {
  return {
    default: {
      document: {
        run: {
          font: "Georgia",
          size: 24,
          color: trimHash(exportStyleContract.colors.text),
        },
        paragraph: {
          spacing: { after: 180, line: 320 },
        },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          bold: true,
          font: "Aptos",
          size: 34,
          color: trimHash(exportStyleContract.colors.textStrong),
        },
        paragraph: {
          keepNext: true,
          spacing: { before: 420, after: 180 },
          border: {
            bottom: {
              color: trimHash(exportStyleContract.colors.border),
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          bold: true,
          font: "Aptos",
          size: 28,
          color: trimHash(exportStyleContract.colors.textStrong),
        },
        paragraph: {
          keepNext: true,
          spacing: { before: 360, after: 160 },
          border: {
            bottom: {
              color: trimHash(exportStyleContract.colors.border),
              style: BorderStyle.SINGLE,
              size: 4,
            },
          },
        },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          bold: true,
          font: "Aptos",
          size: 24,
          color: trimHash(exportStyleContract.colors.textStrong),
        },
        paragraph: {
          keepNext: true,
          spacing: { before: 280, after: 140 },
        },
      },
      {
        id: "Quote",
        name: "Quote",
        basedOn: "Normal",
        quickFormat: true,
        run: {
          italics: true,
          color: trimHash(exportStyleContract.colors.muted),
        },
        paragraph: {
          indent: { left: 360, right: 360 },
          spacing: { before: 80, after: 200 },
          shading: {
            type: ShadingType.CLEAR,
            fill: trimHash(exportStyleContract.colors.quoteBackground),
          },
          border: {
            left: {
              color: trimHash(exportStyleContract.colors.muted),
              style: BorderStyle.SINGLE,
              size: 24,
            },
          },
        },
      },
      {
        id: "CodeBlock",
        name: "Code Block",
        basedOn: "Normal",
        quickFormat: true,
        run: {
          font: "Consolas",
          size: 20,
          color: trimHash(exportStyleContract.colors.codeBlockText),
        },
        paragraph: {
          bidirectional: false,
          spacing: { before: 80, after: 200 },
          shading: {
            type: ShadingType.CLEAR,
            fill: trimHash(exportStyleContract.colors.codeBlockBackground),
          },
        },
      },
    ],
    characterStyles: [
      {
        id: "CodeText",
        name: "Code Text",
        basedOn: "DefaultParagraphFont",
        run: {
          font: "Consolas",
          size: 21,
          color: trimHash(exportStyleContract.colors.textStrong),
          shading: {
            type: ShadingType.CLEAR,
            fill: trimHash(exportStyleContract.colors.codeBackground),
          },
        },
      },
    ],
  };
}

function renderDocxBlocks(markdown: string, context: DocxRenderContext) {
  const tokens = getMarkdownTokens(markdown);
  const children: (Paragraph | Table)[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "heading_open") {
      children.push(
        createDocxParagraph(tokens[index + 1], context, {
          heading: headingStyles[getHeadingLevel(token) - 1] ?? HeadingLevel.HEADING_1,
          bidirectional: context.direction === "rtl",
          alignment: getDocxAlignment(context.direction),
        }),
      );
      continue;
    }

    if (token.type === "paragraph_open") {
      children.push(
        createDocxParagraph(tokens[index + 1], context, {
          bidirectional: context.direction === "rtl",
          alignment: getDocxAlignment(context.direction),
        }),
      );
      continue;
    }

    if (token.type === "blockquote_open") {
      const result = renderDocxBlockquote(tokens, index, context);
      children.push(...result.children);
      index = result.nextIndex;
      continue;
    }

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const result = renderDocxList(
        tokens,
        index,
        context,
        token.type === "ordered_list_open",
      );
      children.push(...result.children);
      index = result.nextIndex;
      continue;
    }

    if (token.type === "fence" || token.type === "code_block") {
      children.push(...renderDocxCodeBlock(token.content, token.info));
      continue;
    }

    if (token.type === "table_open") {
      const result = renderDocxTable(tokens, index, context);
      children.push(result.table);
      index = result.nextIndex;
    }
  }

  return children.length > 0 ? children : [new Paragraph("")];
}

function createDocxParagraph(
  inlineToken: Token | undefined,
  context: DocxRenderContext,
  options: IParagraphOptions = {},
) {
  const children = inlineToken?.children
    ? renderDocxInlineTokens(inlineToken.children, context, {
        rightToLeft: context.direction === "rtl",
      })
    : [];

  return new Paragraph({
    ...options,
    children: children.length > 0 ? children : [new TextRun("")],
  });
}

function renderDocxInlineTokens(
  tokens: Token[],
  context: DocxRenderContext,
  style: InlineStyle = {},
): ParagraphChild[] {
  const children: ParagraphChild[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "strong_open" || token.type === "em_open") {
      const closeType = token.type === "strong_open" ? "strong_close" : "em_close";
      const closeIndex = findMatchingInlineClose(tokens, index, closeType);
      const nextStyle =
        token.type === "strong_open"
          ? { ...style, bold: true }
          : { ...style, italics: true };

      children.push(
        ...renderDocxInlineTokens(
          tokens.slice(index + 1, closeIndex),
          context,
          nextStyle,
        ),
      );
      index = closeIndex;
      continue;
    }

    if (token.type === "link_open") {
      const closeIndex = findMatchingInlineClose(tokens, index, "link_close");
      const href = token.attrGet("href");
      const target = href ? getSafeDocxLinkTarget(href) : null;
      const linkChildren = renderDocxInlineTokens(
        tokens.slice(index + 1, closeIndex),
        context,
        style,
      );

      if (target) {
        children.push(
          new ExternalHyperlink({
            link: target,
            children:
              linkChildren.length > 0
                ? linkChildren
                : [createDocxTextRun(target, { ...style, rightToLeft: false })],
          }),
        );
      } else {
        children.push(...linkChildren);
      }

      index = closeIndex;
      continue;
    }

    if (token.type === "code_inline") {
      children.push(
        createDocxTextRun(token.content, { ...style, code: true, rightToLeft: false }),
      );
      continue;
    }

    if (token.type === "text" || token.type === "image") {
      children.push(
        createDocxTextRun(stripInertMarkdownLinkTargets(token.content), style),
      );
      continue;
    }

    if (token.type === "softbreak" || token.type === "hardbreak") {
      children.push(new TextRun({ break: 1 }));
      continue;
    }

    if (token.children) {
      children.push(...renderDocxInlineTokens(token.children, context, style));
    }
  }

  return children;
}

function createDocxTextRun(text: string, style: InlineStyle = {}) {
  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    style: style.code ? "CodeText" : undefined,
    rightToLeft: style.rightToLeft,
  });
}

function renderDocxList(
  tokens: Token[],
  startIndex: number,
  context: DocxRenderContext,
  ordered: boolean,
) {
  const closeIndex = findMatchingBlockClose(
    tokens,
    startIndex,
    ordered ? "ordered_list_close" : "bullet_list_close",
  );
  const children: Paragraph[] = [];

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index];

    if (token.type !== "list_item_open") {
      continue;
    }

    const itemCloseIndex = findMatchingBlockClose(tokens, index, "list_item_close");
    const inlineToken = findFirstInlineToken(tokens, index + 1, itemCloseIndex);

    children.push(
      createDocxParagraph(inlineToken, context, {
        numbering: {
          reference: ordered ? "mdtor-ordered-list" : "mdtor-bullet-list",
          level: 0,
        },
        bidirectional: context.direction === "rtl",
        alignment: getDocxAlignment(context.direction),
        spacing: { after: 90 },
      }),
    );
    index = itemCloseIndex;
  }

  return {
    children,
    nextIndex: closeIndex,
  };
}

function renderDocxBlockquote(
  tokens: Token[],
  startIndex: number,
  context: DocxRenderContext,
) {
  const closeIndex = findMatchingBlockClose(tokens, startIndex, "blockquote_close");
  const children: Paragraph[] = [];

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    if (tokens[index].type === "inline") {
      children.push(
        createDocxParagraph(tokens[index], context, {
          style: "Quote",
          bidirectional: context.direction === "rtl",
          alignment: getDocxAlignment(context.direction),
        }),
      );
    }
  }

  return {
    children,
    nextIndex: closeIndex,
  };
}

function renderDocxCodeBlock(code: string, languageName: string) {
  return code
    .replace(/\n$/, "")
    .split("\n")
    .map(
      (line) =>
        new Paragraph({
          style: "CodeBlock",
          bidirectional: false,
          alignment: AlignmentType.LEFT,
          children: renderHighlightedCodeRuns(line, languageName),
        }),
    );
}

function renderHighlightedCodeRuns(code: string, languageName: string) {
  const highlightedHtml = highlightCodeToHtml(code, languageName);
  const parsedDocument = new DOMParser().parseFromString(
    `<code>${highlightedHtml}</code>`,
    "text/html",
  );
  const codeElement = parsedDocument.querySelector("code");
  const runs: TextRun[] = [];

  if (!codeElement) {
    return [createCodeRun(code)];
  }

  appendCodeRuns(codeElement, runs);

  return runs.length > 0 ? runs : [createCodeRun("")];
}

function appendCodeRuns(node: Node, runs: TextRun[], inheritedColor?: string) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";

    if (text) {
      runs.push(createCodeRun(text, inheritedColor));
    }

    return;
  }

  if (!(node instanceof Element)) {
    return;
  }

  const color = getCodeTokenColor(node) ?? inheritedColor;

  for (const child of node.childNodes) {
    appendCodeRuns(child, runs, color);
  }
}

function createCodeRun(
  text: string,
  color = trimHash(exportStyleContract.colors.codeBlockText),
) {
  return new TextRun({
    text,
    font: "Consolas",
    size: 20,
    color,
    rightToLeft: false,
  });
}

function getCodeTokenColor(element: Element) {
  const classList = Array.from(element.classList);

  if (classList.some((className) => /keyword|built_in|type|selector/.test(className))) {
    return trimHash(exportStyleContract.colors.keyword);
  }

  if (classList.some((className) => /title|section|function|name/.test(className))) {
    return trimHash(exportStyleContract.colors.title);
  }

  if (
    classList.some((className) =>
      /string|regexp|symbol|template|addition/.test(className),
    )
  ) {
    return trimHash(exportStyleContract.colors.string);
  }

  if (classList.some((className) => /number|literal/.test(className))) {
    return trimHash(exportStyleContract.colors.number);
  }

  if (
    classList.some((className) =>
      /attr|attribute|property|variable|subst|deletion/.test(className),
    )
  ) {
    return trimHash(exportStyleContract.colors.attribute);
  }

  if (classList.some((className) => /comment|quote/.test(className))) {
    return trimHash(exportStyleContract.colors.comment);
  }

  if (classList.some((className) => /meta|doctag|tag/.test(className))) {
    return trimHash(exportStyleContract.colors.meta);
  }

  return null;
}

function renderDocxTable(
  tokens: Token[],
  startIndex: number,
  context: DocxRenderContext,
) {
  const closeIndex = findMatchingBlockClose(tokens, startIndex, "table_close");
  const rows: TableRow[] = [];
  let currentCells: TableCell[] = [];

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index];

    if (token.type === "tr_open") {
      currentCells = [];
      continue;
    }

    if (token.type === "tr_close") {
      rows.push(new TableRow({ children: currentCells }));
      continue;
    }

    if (token.type === "th_open" || token.type === "td_open") {
      const inlineToken = findFirstInlineToken(tokens, index + 1, closeIndex);
      const isHeader = token.type === "th_open";

      currentCells.push(
        new TableCell({
          shading: isHeader
            ? {
                type: ShadingType.CLEAR,
                fill: trimHash(exportStyleContract.colors.quoteBackground),
              }
            : undefined,
          children: [
            createDocxParagraph(inlineToken, context, {
              bidirectional: context.direction === "rtl",
              alignment: getDocxAlignment(context.direction),
            }),
          ],
        }),
      );
    }
  }

  return {
    table: new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.AUTOFIT,
    }),
    nextIndex: closeIndex,
  };
}

function getHeadingLevel(token: Token) {
  const level = Number(token.tag.replace("h", ""));

  return Number.isFinite(level) ? Math.min(Math.max(level, 1), 6) : 1;
}

function findMatchingBlockClose(tokens: Token[], openIndex: number, closeType: string) {
  const openType = tokens[openIndex].type;
  let depth = 0;

  for (let index = openIndex; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === openType) {
      depth += 1;
    } else if (token.type === closeType) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return tokens.length - 1;
}

function findMatchingInlineClose(tokens: Token[], openIndex: number, closeType: string) {
  const openType = tokens[openIndex].type;
  let depth = 0;

  for (let index = openIndex; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === openType) {
      depth += 1;
    } else if (token.type === closeType) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return openIndex;
}

function findFirstInlineToken(tokens: Token[], startIndex: number, endIndex: number) {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (tokens[index].type === "inline") {
      return tokens[index];
    }
  }

  return undefined;
}

function getSafeDocxLinkTarget(href: string) {
  const trimmedHref = href.trim();

  try {
    const url = new URL(trimmedHref);

    return safeDocxLinkProtocols.has(url.protocol.toLowerCase()) ? trimmedHref : null;
  } catch {
    return null;
  }
}

function getDocxAlignment(direction: ExportDocumentDirection) {
  return direction === "rtl" ? AlignmentType.RIGHT : AlignmentType.LEFT;
}

function trimHash(value: string) {
  return value.replace(/^#/, "");
}

function stripInertMarkdownLinkTargets(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}
