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
        children: renderDocxDocuments(documents, { direction }),
      },
    ],
  });
  const arrayBuffer = await Packer.toArrayBuffer(doc);

  return new Uint8Array(arrayBuffer);
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

function stripInertMarkdownLinkTargets(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}
