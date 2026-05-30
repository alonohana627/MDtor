import { parseMarkdown } from "./parseMarkdown";
import { type MarkdownBlock } from "./types";

const textEncoder = new TextEncoder();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value: string) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function renderInlineHtml(text: string) {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|mailto:[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

function renderHtmlBlock(block: MarkdownBlock) {
  if (block.type === "heading") {
    return `<h${block.level}>${renderInlineHtml(block.text)}</h${block.level}>`;
  }

  if (block.type === "paragraph") {
    return `<p>${renderInlineHtml(block.text)}</p>`;
  }

  if (block.type === "blockquote") {
    return `<blockquote>${renderInlineHtml(block.text)}</blockquote>`;
  }

  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    const items = block.items
      .map((item) => `<li>${renderInlineHtml(item.text)}</li>`)
      .join("\n");

    return `<${tag}>\n${items}\n</${tag}>`;
  }

  return `<pre><code class="language-${escapeHtml(block.language)}">${escapeHtml(block.code)}</code></pre>`;
}

export function markdownToStandaloneHtml(markdown: string, title = "Document") {
  const body = parseMarkdown(markdown).map(renderHtmlBlock).join("\n");

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

function blockToPlainLines(block: MarkdownBlock) {
  if (block.type === "heading") {
    return [`${"#".repeat(block.level)} ${block.text}`, ""];
  }

  if (block.type === "paragraph" || block.type === "blockquote") {
    return [block.text, ""];
  }

  if (block.type === "list") {
    return [
      ...block.items.map((item, index) =>
        block.ordered ? `${index + 1}. ${item.text}` : `- ${item.text}`,
      ),
      "",
    ];
  }

  return [block.code, ""];
}

function markdownToPlainLines(markdown: string) {
  return parseMarkdown(markdown).flatMap(blockToPlainLines);
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

function renderDocxRuns(text: string, context: DocxRenderContext) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`)/g);

  return parts
    .map((part) => {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const target = getSafeDocxLinkTarget(link[2]);

        if (!target) {
          return `<w:r><w:t>${escapeXml(link[1])}</w:t></w:r>`;
        }

        const relationshipId = addDocxHyperlink(context, target);

        return `<w:hyperlink r:id="${relationshipId}" w:history="1"><w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t>${escapeXml(link[1])}</w:t></w:r></w:hyperlink>`;
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return `<w:r><w:rPr><w:rStyle w:val="Code"/></w:rPr><w:t>${escapeXml(part.slice(1, -1))}</w:t></w:r>`;
      }

      return `<w:r><w:t>${escapeXml(part)}</w:t></w:r>`;
    })
    .join("");
}

function renderDocxParagraph(text: string, context: DocxRenderContext, style?: string) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";

  return `<w:p>${styleXml}${renderDocxRuns(text, context)}</w:p>`;
}

function renderDocxBlock(block: MarkdownBlock, context: DocxRenderContext) {
  if (block.type === "heading") {
    return renderDocxParagraph(block.text, context, `Heading${block.level}`);
  }

  if (block.type === "paragraph") {
    return renderDocxParagraph(block.text, context);
  }

  if (block.type === "blockquote") {
    return renderDocxParagraph(block.text, context, "Quote");
  }

  if (block.type === "list") {
    return block.items
      .map((item, index) =>
        renderDocxParagraph(
          `${block.ordered ? `${index + 1}.` : "-"} ${item.text}`,
          context,
          "ListParagraph",
        ),
      )
      .join("");
  }

  return renderDocxParagraph(block.code, context, "Code");
}

export function markdownToDocxBytes(markdown: string) {
  const context: DocxRenderContext = { relationships: [] };
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${parseMarkdown(markdown)
      .map((block) => renderDocxBlock(block, context))
      .join("\n")}
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
