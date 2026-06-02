import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  TextRun,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import JSZip from "jszip";
import type Token from "markdown-it/lib/token.mjs";
import { highlightCodeToHtml } from "../codeHighlighting";
import {
  docxPageMargin,
  exportStyleContract,
  trimHash,
  type ExportDocumentDirection,
} from "./styles";
import { getMarkdownTokens } from "../markdownRendererCore";
import { type MarkdownExportDocument } from "./types";

const safeDocxLinkProtocols = new Set(["http:", "https:", "mailto:"]);
const headingStyles = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
  rightToLeft?: boolean;
};

type DocxRenderContext = {
  direction: ExportDocumentDirection;
};

export async function markdownToDocxBytes(
  markdown: string,
  direction: ExportDocumentDirection = "ltr",
) {
  return markdownDocumentsToDocxBytes(
    [{ relativePath: "Document", markdown }],
    direction,
  );
}

export async function markdownDocumentsToDocxBytes(
  documents: MarkdownExportDocument[],
  direction: ExportDocumentDirection = "ltr",
) {
  const doc = new Document({
    creator: "MDtor",
    description: "Markdown document exported from MDtor",
    styles: createDocxStyles(direction),
    numbering: createDocxNumbering(direction),
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
        children: renderDocxDocuments(documents, { direction }),
      },
    ],
  });
  const arrayBuffer = await Packer.toArrayBuffer(doc);
  const bytes = new Uint8Array(arrayBuffer);

  return direction === "rtl" ? applyDocxRtlPackageDirection(bytes) : bytes;
}

function createDocxNumbering(direction: ExportDocumentDirection) {
  const alignment = getDocxAlignment(direction);
  const indent =
    direction === "rtl" ? { right: 720, hanging: 360 } : { left: 720, hanging: 360 };

  return {
    config: [
      {
        reference: "mdtor-bullet-list",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment,
            style: { paragraph: { indent } },
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
            alignment,
            style: { paragraph: { indent } },
          },
        ],
      },
    ],
  };
}

async function applyDocxRtlPackageDirection(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);

  await transformDocxXmlPart(zip, "word/document.xml", addRtlDocumentDirection);
  await transformDocxXmlPart(zip, "word/styles.xml", addRtlStylesDirection);
  await transformDocxXmlPart(zip, "word/settings.xml", addRtlSettingsDirection);
  await transformDocxXmlPart(zip, "word/numbering.xml", addRtlNumberingDirection);

  return zip.generateAsync({ type: "uint8array" });
}

async function transformDocxXmlPart(
  zip: JSZip,
  path: string,
  transform: (xml: string) => string,
) {
  const file = zip.file(path);

  if (!file) {
    return;
  }

  zip.file(path, transform(await file.async("string")));
}

function addRtlDocumentDirection(documentXml: string) {
  return addRtlRunProperties(
    addRtlParagraphProperties(addRtlSectionProperties(documentXml)),
  );
}

function addRtlSectionProperties(documentXml: string) {
  return documentXml.replace(
    /<w:sectPr\b([^>]*)>([\s\S]*?)<\/w:sectPr>/g,
    (_section, attributes: string, content: string) => {
      const bidi = content.includes("<w:bidi") ? "" : "<w:bidi/>";
      const rtlGutter = content.includes("<w:rtlGutter") ? "" : "<w:rtlGutter/>";
      const rtlSectionProperties = `${bidi}${rtlGutter}`;

      if (!rtlSectionProperties) {
        return `<w:sectPr${attributes}>${content}</w:sectPr>`;
      }

      const lateSectionPropertyIndex = content.search(
        /<w:(?:docGrid|printerSettings|sectPrChange)\b/,
      );
      const nextContent =
        lateSectionPropertyIndex === -1
          ? `${content}${rtlSectionProperties}`
          : `${content.slice(0, lateSectionPropertyIndex)}${rtlSectionProperties}${content.slice(
              lateSectionPropertyIndex,
            )}`;

      return `<w:sectPr${attributes}>${nextContent}</w:sectPr>`;
    },
  );
}

function addRtlStylesDirection(stylesXml: string) {
  return ensureNormalStyle(
    addRtlRunPropertyBlocks(addRtlParagraphProperties(stylesXml)),
  );
}

function addRtlSettingsDirection(settingsXml: string) {
  if (/<w:themeFontLang\b/.test(settingsXml)) {
    return settingsXml.replace(/<w:themeFontLang\b([^>]*)\/>/g, (_tag, attributes) => {
      const nextAttributes = String(attributes).replace(/\s+w:bidi="[^"]*"/, "");

      return `<w:themeFontLang${nextAttributes} w:bidi="he-IL"/>`;
    });
  }

  return settingsXml.replace(
    "</w:settings>",
    '<w:themeFontLang w:bidi="he-IL"/></w:settings>',
  );
}

function addRtlNumberingDirection(numberingXml: string) {
  return addRtlParagraphProperties(numberingXml)
    .replace(/<w:lvlJc\b[^>]*\/>/g, '<w:lvlJc w:val="start"/>')
    .replace(/<w:ind\b([^>]*)\/>/g, (_tag, attributes) => {
      const attrs = String(attributes);
      const leftValue = attrs.match(/\s+w:left="([^"]+)"/)?.[1];
      let nextAttributes = attrs
        .replace(/\s+w:left="[^"]*"/, "")
        .replace(/\s+w:start="[^"]*"/, "");

      if (leftValue) {
        if (/\s+w:right="[^"]*"/.test(nextAttributes)) {
          nextAttributes = nextAttributes.replace(
            /\s+w:right="[^"]*"/,
            ` w:right="${leftValue}"`,
          );
        } else {
          nextAttributes += ` w:right="${leftValue}"`;
        }

        nextAttributes += ` w:start="${leftValue}"`;
      }

      return `<w:ind${nextAttributes}/>`;
    });
}

function addRtlParagraphProperties(xml: string) {
  return xml
    .replace(/<w:pPr\b([^>]*)\/>/g, (_tag, attributes) => {
      return `<w:pPr${attributes}>${rtlParagraphPropertiesXml()}</w:pPr>`;
    })
    .replace(/<w:pPr\b([^>]*)>([\s\S]*?)<\/w:pPr>/g, (_tag, attributes, content) => {
      return `<w:pPr${attributes}>${mergeRtlParagraphProperties(content)}</w:pPr>`;
    })
    .replace(/<w:p\b([^>]*)>((?:(?!<w:pPr\b)[\s\S])*?)<\/w:p>/g, (
      _paragraph,
      attributes,
      content,
    ) => {
      return `<w:p${attributes}><w:pPr>${rtlParagraphPropertiesXml()}</w:pPr>${content}</w:p>`;
    });
}

function mergeRtlParagraphProperties(content: string) {
  const runProperties = content
    .match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/g)
    ?.join("") ?? "";
  let nextContent = content
    .replace(/<w:bidi\b[^>]*\/>/g, "")
    .replace(/<w:jc\b[^>]*\/>/g, "")
    .replace(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/g, "");

  nextContent = insertBeforeFirstMatchingTag(
    nextContent,
    "<w:bidi/>",
    [
      "spacing",
      "ind",
      "contextualSpacing",
      "mirrorIndents",
      "suppressOverlap",
      "jc",
      "textDirection",
      "textAlignment",
      "textboxTightWrap",
      "outlineLvl",
      "divId",
      "cnfStyle",
    ],
  );

  nextContent = insertBeforeFirstMatchingTag(
    nextContent,
    '<w:jc w:val="start"/>',
    ["textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle"],
  );
  nextContent += runProperties
    ? addRtlRunPropertyBlocks(runProperties)
    : `<w:rPr>${rtlRunPropertiesXml()}</w:rPr>`;

  return nextContent;
}

function insertBeforeFirstMatchingTag(
  content: string,
  insertion: string,
  tagNames: string[],
) {
  const tagPattern = new RegExp(`<w:(?:${tagNames.join("|")})\\b`);
  const match = tagPattern.exec(content);

  if (!match) {
    return `${content}${insertion}`;
  }

  return `${content.slice(0, match.index)}${insertion}${content.slice(match.index)}`;
}

function addRtlRunProperties(xml: string) {
  return xml.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g, (
    _run,
    attributes,
    content,
  ) => {
    const nextContent = /<w:rPr\b/.test(content)
      ? addRtlRunPropertyBlocks(content)
      : `<w:rPr>${rtlRunPropertiesXml()}</w:rPr>${content}`;

    return `<w:r${attributes}>${nextContent}</w:r>`;
  });
}

function addRtlRunPropertyBlocks(xml: string) {
  return xml
    .replace(/<w:rPr\b([^>]*)\/>/g, (_tag, attributes) => {
      return `<w:rPr${attributes}>${rtlRunPropertiesXml()}</w:rPr>`;
    })
    .replace(/<w:rPr\b([^>]*)>([\s\S]*?)<\/w:rPr>/g, (_tag, attributes, content) => {
      const nextContent = mergeRtlRunProperties(content);

      return `<w:rPr${attributes}>${nextContent}</w:rPr>`;
    });
}

function mergeRtlRunProperties(content: string) {
  let nextContent = content;

  if (!/<w:rtl\b/.test(nextContent)) {
    nextContent = `<w:rtl/>${nextContent}`;
  }

  if (!/<w:cs\b/.test(nextContent)) {
    nextContent = `<w:cs/>${nextContent}`;
  }

  if (/<w:lang\b[^>]*\/>/.test(nextContent)) {
    nextContent = nextContent.replace(/<w:lang\b([^>]*)\/>/g, (_tag, attributes) => {
      const nextAttributes = String(attributes).replace(/\s+w:bidi="[^"]*"/, "");

      return `<w:lang${nextAttributes} w:bidi="he-IL"/>`;
    });
  } else {
    nextContent += '<w:lang w:bidi="he-IL"/>';
  }

  return nextContent;
}

function ensureNormalStyle(stylesXml: string) {
  if (/<w:style\b(?=[^>]*w:type="paragraph")(?=[^>]*w:styleId="Normal")/.test(stylesXml)) {
    return stylesXml;
  }

  const normalStyle = [
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">',
    '<w:name w:val="Normal"/>',
    "<w:qFormat/>",
    `<w:pPr>${rtlParagraphPropertiesXml()}</w:pPr>`,
    `<w:rPr>${rtlRunPropertiesXml()}</w:rPr>`,
    "</w:style>",
  ].join("");

  if (/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/.test(stylesXml)) {
    return stylesXml.replace(/(<w:docDefaults>[\s\S]*?<\/w:docDefaults>)/, `$1${normalStyle}`);
  }

  return stylesXml.replace(/(<w:styles\b[^>]*>)/, `$1${normalStyle}`);
}

function rtlParagraphPropertiesXml() {
  return `<w:bidi/><w:jc w:val="start"/><w:rPr>${rtlRunPropertiesXml()}</w:rPr>`;
}

function rtlRunPropertiesXml() {
  return '<w:cs/><w:rtl/><w:lang w:bidi="he-IL"/>';
}

function createDocxStyles(direction: ExportDocumentDirection) {
  const rtlParagraphProperties =
    direction === "rtl"
      ? {
          bidirectional: true,
          alignment: AlignmentType.START,
          run: { rightToLeft: true },
        }
      : {};

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
          ...rtlParagraphProperties,
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
          ...rtlParagraphProperties,
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
          ...rtlParagraphProperties,
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
          ...rtlParagraphProperties,
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
          ...rtlParagraphProperties,
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
        id: "QuoteRtl",
        name: "Quote RTL",
        basedOn: "Normal",
        quickFormat: true,
        run: {
          italics: true,
          color: trimHash(exportStyleContract.colors.muted),
        },
        paragraph: {
          indent: { left: 360, right: 360 },
          spacing: { before: 80, after: 200 },
          ...rtlParagraphProperties,
          shading: {
            type: ShadingType.CLEAR,
            fill: trimHash(exportStyleContract.colors.quoteBackground),
          },
          border: {
            right: {
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
  const children: Paragraph[] = [];

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
  }

  return children.length > 0 ? children : [new Paragraph("")];
}

function renderDocxDocuments(
  documents: MarkdownExportDocument[],
  context: DocxRenderContext,
) {
  const exportDocuments =
    documents.length > 0 ? documents : [{ relativePath: "untitled.md", markdown: "" }];
  const children: Paragraph[] = [];

  for (const [index, document] of exportDocuments.entries()) {
    if (index > 0) {
      children.push(createDocxPageBreakParagraph());
    }

    children.push(...renderDocxBlocks(document.markdown, context));
  }

  return children;
}

function createDocxPageBreakParagraph() {
  return new Paragraph({
    children: [new PageBreak()],
  });
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
          style: context.direction === "rtl" ? "QuoteRtl" : "Quote",
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
  return direction === "rtl" ? AlignmentType.START : AlignmentType.LEFT;
}

function stripInertMarkdownLinkTargets(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}
