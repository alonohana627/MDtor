import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import {
  escapeHtml,
  highlightCodeToHtml,
  renderHighlightedCodeBlockHtml,
} from "./codeHighlighting";
import { slugifyHeading } from "./headingSlugs";

const textEncoder = new TextEncoder();

const exportHtmlRenderer = new MarkdownIt("commonmark", {
  html: false,
  linkify: false,
  typographer: false,
  highlight: highlightCodeToHtml,
})
  .use(markdownItTaskLists, {
    enabled: false,
    label: true,
    labelAfter: true,
  })
  .use(markdownItFootnote)
  .use(markdownItAnchor, {
    slugify: slugifyHeading,
  });

exportHtmlRenderer.validateLink = () => true;
exportHtmlRenderer.renderer.rules.fence = renderCodeBlock;
exportHtmlRenderer.renderer.rules.code_block = renderCodeBlock;

function escapeXml(value: string) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function renderExportHtml(markdown: string) {
  return DOMPurify.sanitize(exportHtmlRenderer.render(markdown), {
    ALLOW_UNKNOWN_PROTOCOLS: false,
    USE_PROFILES: { html: true },
  });
}

function getExportMarkdownTokens(markdown: string) {
  return exportHtmlRenderer.parse(markdown, {});
}

function renderCodeBlock(tokens: Token[], index: number) {
  const token = tokens[index];

  return renderHighlightedCodeBlockHtml(token.content, token.info);
}

export function markdownToStandaloneHtml(markdown: string, title = "Document") {
  const body = renderExportHtml(markdown);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { max-width: 760px; margin: 48px auto; padding: 0 24px; color: #17202a; background: #ffffff; font-family: Georgia, "Times New Roman", serif; line-height: 1.65; }
    h1, h2, h3, h4, h5, h6 { color: #101828; font-family: "Aptos", "Segoe UI", sans-serif; line-height: 1.2; margin: 1.35em 0 0.55em; }
    h1 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.25em; font-size: 2.15rem; }
    h2 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; font-size: 1.55rem; }
    blockquote { margin: 0 0 1em; padding: 0.2em 1em; color: #57606a; border-left: 4px solid #8c959f; background: #f6f8fa; }
    code { border-radius: 4px; padding: 0.12em 0.3em; background: #eaeef2; font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
    pre { overflow: auto; border: 1px solid #d0d7de; border-radius: 8px; padding: 16px; background: #0f172a; color: #e5e7eb; }
    pre code { padding: 0; background: transparent; color: inherit; }
    img { display: block; max-width: 100%; height: auto; margin: 1rem 0; }
    a { color: #0969da; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

function markdownToPlainLines(markdown: string) {
  const tokens = getExportMarkdownTokens(markdown);
  const lines: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "heading_open") {
      lines.push(`${"#".repeat(getHeadingLevel(token))} ${getInlineText(tokens[index + 1])}`);
      lines.push("");
      continue;
    }

    if (token.type === "paragraph_open") {
      lines.push(getInlineText(tokens[index + 1]));
      lines.push("");
      continue;
    }

    if (token.type === "blockquote_open") {
      const result = renderPlainBlockquote(tokens, index);
      lines.push(...result.lines);
      index = result.nextIndex;
      continue;
    }

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const result = renderPlainList(tokens, index, token.type === "ordered_list_open");
      lines.push(...result.lines);
      index = result.nextIndex;
      continue;
    }

    if (token.type === "fence" || token.type === "code_block") {
      lines.push(...token.content.replace(/\n$/, "").split("\n"));
      lines.push("");
    }
  }

  return lines;
}

function getHeadingLevel(token: Token) {
  const level = Number(token.tag.replace("h", ""));

  return Number.isFinite(level) ? level : 1;
}

function getInlineText(token: Token | undefined): string {
  if (!token) {
    return "";
  }

  if (token.children) {
    return token.children.map(getInlineText).join("");
  }

  if (
    token.type === "text" ||
    token.type === "code_inline" ||
    token.type === "image"
  ) {
    return token.content;
  }

  if (token.type === "softbreak" || token.type === "hardbreak") {
    return "\n";
  }

  return "";
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

function findFirstInlineToken(tokens: Token[], startIndex: number, endIndex: number) {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (tokens[index].type === "inline") {
      return tokens[index];
    }
  }

  return undefined;
}

function renderPlainList(tokens: Token[], startIndex: number, ordered: boolean) {
  const closeIndex = findMatchingBlockClose(
    tokens,
    startIndex,
    ordered ? "ordered_list_close" : "bullet_list_close",
  );
  const lines: string[] = [];
  const startAttribute = tokens[startIndex].attrGet("start");
  let itemNumber = startAttribute ? Number(startAttribute) : 1;

  if (!Number.isFinite(itemNumber)) {
    itemNumber = 1;
  }

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index];

    if (token.type !== "list_item_open") {
      continue;
    }

    const itemCloseIndex = findMatchingBlockClose(tokens, index, "list_item_close");
    const inlineToken = findFirstInlineToken(tokens, index + 1, itemCloseIndex);
    const marker = ordered ? `${itemNumber}.` : "-";

    lines.push(`${marker} ${getInlineText(inlineToken)}`);
    itemNumber += 1;
    index = itemCloseIndex;
  }

  lines.push("");

  return {
    lines,
    nextIndex: closeIndex,
  };
}

function renderPlainBlockquote(tokens: Token[], startIndex: number) {
  const closeIndex = findMatchingBlockClose(tokens, startIndex, "blockquote_close");
  const lines: string[] = [];

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    if (tokens[index].type === "inline") {
      lines.push(getInlineText(tokens[index]));
    }
  }

  lines.push("");

  return {
    lines,
    nextIndex: closeIndex,
  };
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function markdownToPdfBytes(markdown: string, title = "Document") {
  const lines = [
    title,
    "",
    ...markdownToPlainLines(markdown).flatMap((line) =>
      line.length > 92
        ? (line.match(/.{1,92}(\s|$)/g)?.map((part) => part.trim()) ?? [line])
        : [line],
    ),
  ];
  const lineHeight = 16;
  const pageHeight = Math.max(792, 96 + lines.length * lineHeight);
  const textCommands = lines
    .map(
      (line, index) =>
        `1 0 0 1 72 ${pageHeight - 72 - index * lineHeight} Tm (${escapePdfText(line)}) Tj`,
    )
    .join("\n");
  const stream = `BT
/F1 11 Tf
${textCommands}
ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${textEncoder.encode(stream).length} >> stream
${stream}
endstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(textEncoder.encode(pdf).length);
    pdf += `${object}\n`;
  }

  const xrefOffset = textEncoder.encode(pdf).length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
${offsets
  .slice(1)
  .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
  .join("\n")}
trailer << /Root 1 0 R /Size ${objects.length + 1} >>
startxref
${xrefOffset}
%%EOF`;

  return textEncoder.encode(pdf);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number) {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function createStoredZip(entries: { name: string; content: string }[]) {
  const output: number[] = [];
  const centralDirectory: number[] = [];

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const contentBytes = textEncoder.encode(entry.content);
    const checksum = crc32(contentBytes);
    const localHeaderOffset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, contentBytes.length);
    writeUint32(output, contentBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...contentBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    centralDirectory.push(...nameBytes);
  }

  const centralDirectoryOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, entries.length);
  writeUint16(output, entries.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Uint8Array(output);
}

type DocxRelationship = {
  id: string;
  target: string;
};

type DocxRenderContext = {
  relationships: DocxRelationship[];
};

const safeDocxLinkProtocols = new Set(["http:", "https:", "mailto:"]);

function getSafeDocxLinkTarget(href: string) {
  const trimmedHref = href.trim();

  try {
    const url = new URL(trimmedHref);

    return safeDocxLinkProtocols.has(url.protocol.toLowerCase()) ? trimmedHref : null;
  } catch {
    return null;
  }
}

function addDocxHyperlink(context: DocxRenderContext, target: string) {
  const id = `rId${context.relationships.length + 1}`;
  context.relationships.push({ id, target });
  return id;
}

function renderDocxTextRun(text: string, runStyle?: string) {
  const styleXml = runStyle ? `<w:rPr><w:rStyle w:val="${runStyle}"/></w:rPr>` : "";

  return text
    .split("\n")
    .map((part, index) => {
      const breakXml = index === 0 ? "" : "<w:br/>";

      return `<w:r>${styleXml}${breakXml}<w:t>${escapeXml(part)}</w:t></w:r>`;
    })
    .join("");
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

function renderDocxInlineTokens(tokens: Token[], context: DocxRenderContext): string {
  let xml = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "link_open") {
      const closeIndex = findMatchingInlineClose(tokens, index, "link_close");
      const href = token.attrGet("href");
      const target = href ? getSafeDocxLinkTarget(href) : null;
      const innerXml = renderDocxInlineTokens(
        tokens.slice(index + 1, closeIndex),
        context,
      );

      if (target) {
        const relationshipId = addDocxHyperlink(context, target);

        xml += `<w:hyperlink r:id="${relationshipId}" w:history="1">${innerXml}</w:hyperlink>`;
      } else {
        xml += innerXml;
      }

      index = closeIndex;
      continue;
    }

    if (token.type === "text" || token.type === "image") {
      xml += renderDocxTextRun(token.content);
      continue;
    }

    if (token.type === "code_inline") {
      xml += renderDocxTextRun(token.content, "Code");
      continue;
    }

    if (token.type === "softbreak" || token.type === "hardbreak") {
      xml += "<w:r><w:br/></w:r>";
      continue;
    }

    if (token.children) {
      xml += renderDocxInlineTokens(token.children, context);
    }
  }

  return xml;
}

function renderDocxParagraph(
  inlineToken: Token | undefined,
  context: DocxRenderContext,
  style?: string,
  prefix = "",
) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  const prefixXml = prefix ? renderDocxTextRun(prefix) : "";
  const inlineXml = inlineToken?.children
    ? renderDocxInlineTokens(inlineToken.children, context)
    : "";

  return `<w:p>${styleXml}${prefixXml}${inlineXml}</w:p>`;
}

function renderDocxTextParagraph(text: string, style?: string) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";

  return `<w:p>${styleXml}${renderDocxTextRun(text, style === "Code" ? "Code" : undefined)}</w:p>`;
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
  const startAttribute = tokens[startIndex].attrGet("start");
  let itemNumber = startAttribute ? Number(startAttribute) : 1;
  let xml = "";

  if (!Number.isFinite(itemNumber)) {
    itemNumber = 1;
  }

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    const token = tokens[index];

    if (token.type !== "list_item_open") {
      continue;
    }

    const itemCloseIndex = findMatchingBlockClose(tokens, index, "list_item_close");
    const inlineToken = findFirstInlineToken(tokens, index + 1, itemCloseIndex);
    const marker = ordered ? `${itemNumber}. ` : "- ";

    xml += renderDocxParagraph(inlineToken, context, "ListParagraph", marker);
    itemNumber += 1;
    index = itemCloseIndex;
  }

  return {
    xml,
    nextIndex: closeIndex,
  };
}

function renderDocxBlockquote(
  tokens: Token[],
  startIndex: number,
  context: DocxRenderContext,
) {
  const closeIndex = findMatchingBlockClose(tokens, startIndex, "blockquote_close");
  let xml = "";

  for (let index = startIndex + 1; index < closeIndex; index += 1) {
    if (tokens[index].type === "inline") {
      xml += renderDocxParagraph(tokens[index], context, "Quote");
    }
  }

  return {
    xml,
    nextIndex: closeIndex,
  };
}

function renderDocxBody(markdown: string, context: DocxRenderContext) {
  const tokens = getExportMarkdownTokens(markdown);
  let xml = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "heading_open") {
      xml += renderDocxParagraph(
        tokens[index + 1],
        context,
        `Heading${getHeadingLevel(token)}`,
      );
      continue;
    }

    if (token.type === "paragraph_open") {
      xml += renderDocxParagraph(tokens[index + 1], context);
      continue;
    }

    if (token.type === "blockquote_open") {
      const result = renderDocxBlockquote(tokens, index, context);
      xml += result.xml;
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
      xml += result.xml;
      index = result.nextIndex;
      continue;
    }

    if (token.type === "fence" || token.type === "code_block") {
      xml += renderDocxTextParagraph(token.content.replace(/\n$/, ""), "Code");
    }
  }

  return xml;
}

export function markdownToDocxBytes(markdown: string) {
  const context: DocxRenderContext = { relationships: [] };
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${renderDocxBody(markdown, context)}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
  const documentRelationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${context.relationships
    .map(
      (relationship) =>
        `<Relationship Id="${relationship.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(relationship.target)}" TargetMode="External"/>`,
    )
    .join("\n")}
</Relationships>`;

  return createStoredZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    {
      name: "word/document.xml",
      content: documentXml,
    },
    {
      name: "word/_rels/document.xml.rels",
      content: documentRelationshipsXml,
    },
    {
      name: "word/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/></w:style>
  <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style>
</w:styles>`,
    },
  ]);
}
