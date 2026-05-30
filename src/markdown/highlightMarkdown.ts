export type MarkdownTokenType =
  | "plain"
  | "heading-marker"
  | "heading-text"
  | "list-marker"
  | "quote-marker"
  | "quote-text"
  | "code-fence"
  | "code-language"
  | "code-text"
  | "inline-code"
  | "strong"
  | "emphasis"
  | "link-text"
  | "link-url";

export type MarkdownToken = {
  type: MarkdownTokenType;
  text: string;
};

export type MarkdownHighlightIndex = {
  text: string;
  lineStarts: number[];
  codeBlockOpenBeforeLine: boolean[];
};

function normalizeMarkdownNewlines(markdown: string) {
  return markdown.includes("\r") ? markdown.replace(/\r\n?/g, "\n") : markdown;
}

export function createMarkdownHighlightIndex(markdown: string): MarkdownHighlightIndex {
  const text = normalizeMarkdownNewlines(markdown);
  const lineStarts = [0];
  const codeBlockOpenBeforeLine: boolean[] = [];
  let inCodeBlock = false;
  let lineStart = 0;
  let lineNumber = 0;

  while (lineStart <= text.length) {
    const newlineIndex = text.indexOf("\n", lineStart);
    const lineEnd = newlineIndex === -1 ? text.length : newlineIndex;
    const line = text.slice(lineStart, lineEnd);

    codeBlockOpenBeforeLine[lineNumber] = inCodeBlock;

    if (/^(\s*```)([^\s`]*)?(.*)$/.test(line)) {
      inCodeBlock = !inCodeBlock;
    }

    if (newlineIndex === -1) {
      break;
    }

    lineStart = newlineIndex + 1;
    lineStarts.push(lineStart);
    lineNumber += 1;
  }

  return {
    text,
    lineStarts,
    codeBlockOpenBeforeLine,
  };
}

export function getMarkdownHighlightLineCount(index: MarkdownHighlightIndex) {
  return index.lineStarts.length;
}

export function highlightMarkdown(markdown: string): MarkdownToken[][] {
  const index = createMarkdownHighlightIndex(markdown);

  return highlightMarkdownRange(index, 1, getMarkdownHighlightLineCount(index));
}

export function highlightMarkdownRange(
  index: MarkdownHighlightIndex,
  startLine: number,
  endLine: number,
): MarkdownToken[][] {
  const lineCount = getMarkdownHighlightLineCount(index);
  const safeStartLine = Math.max(1, Math.min(lineCount, Math.floor(startLine)));
  const safeEndLine = Math.max(safeStartLine, Math.min(lineCount, Math.floor(endLine)));
  let inCodeBlock = index.codeBlockOpenBeforeLine[safeStartLine - 1] ?? false;
  const highlightedLines: MarkdownToken[][] = [];

  for (let lineNumber = safeStartLine; lineNumber <= safeEndLine; lineNumber += 1) {
    const line = getIndexedLine(index, lineNumber);
    const highlightedLine = highlightLine(line, inCodeBlock);

    highlightedLines.push(highlightedLine.tokens);
    inCodeBlock = highlightedLine.inCodeBlock;
  }

  return highlightedLines;
}

function getIndexedLine(index: MarkdownHighlightIndex, lineNumber: number) {
  const start = index.lineStarts[lineNumber - 1] ?? 0;
  const nextStart = index.lineStarts[lineNumber];
  const end = nextStart === undefined ? index.text.length : nextStart - 1;

  return index.text.slice(start, end);
}

function highlightLine(line: string, inCodeBlock: boolean) {
  const fence = line.match(/^(\s*```)([^\s`]*)?(.*)$/);

  if (fence) {
    return {
      tokens: [
        { type: "code-fence", text: fence[1] },
        { type: "code-language", text: fence[2] ?? "" },
        { type: "plain", text: fence[3] ?? "" },
      ] satisfies MarkdownToken[],
      inCodeBlock: !inCodeBlock,
    };
  }

  if (inCodeBlock) {
    return {
      tokens: [{ type: "code-text", text: line }] satisfies MarkdownToken[],
      inCodeBlock,
    };
  }

  const heading = line.match(/^(#{1,6})(\s+)(.*)$/);
  if (heading) {
    return {
      tokens: [
        { type: "heading-marker", text: heading[1] },
        { type: "plain", text: heading[2] },
        { type: "heading-text", text: heading[3] },
      ] satisfies MarkdownToken[],
      inCodeBlock,
    };
  }

  const quote = line.match(/^(\s*> ?)(.*)$/);
  if (quote) {
    return {
      tokens: [
        { type: "quote-marker", text: quote[1] },
        ...highlightInline(quote[2], "quote-text"),
      ] satisfies MarkdownToken[],
      inCodeBlock,
    };
  }

  const list = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/);
  if (list) {
    return {
      tokens: [
        { type: "list-marker", text: list[1] },
        ...highlightInline(list[2]),
      ] satisfies MarkdownToken[],
      inCodeBlock,
    };
  }

  return {
    tokens: highlightInline(line),
    inCodeBlock,
  };
}

function highlightInline(text: string, plainType: MarkdownTokenType = "plain") {
  const tokens: MarkdownToken[] = [];
  const inlinePattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;

  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = inlinePattern.exec(text))) {
    pushPlain(tokens, text.slice(cursor, match.index), plainType);
    pushInlineToken(tokens, match[0], plainType);
    cursor = match.index + match[0].length;
  }

  pushPlain(tokens, text.slice(cursor), plainType);

  return tokens.length > 0 ? tokens : [{ type: plainType, text: "" }];
}

function pushPlain(tokens: MarkdownToken[], text: string, type: MarkdownTokenType) {
  if (text) {
    tokens.push({ type, text });
  }
}

function pushInlineToken(
  tokens: MarkdownToken[],
  token: string,
  fallbackType: MarkdownTokenType,
) {
  const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (link) {
    tokens.push(
      { type: "plain", text: "[" },
      { type: "link-text", text: link[1] },
      { type: "plain", text: "](" },
      { type: "link-url", text: link[2] },
      { type: "plain", text: ")" },
    );
    return;
  }

  if (token.startsWith("`") && token.endsWith("`")) {
    tokens.push({ type: "inline-code", text: token });
    return;
  }

  if (token.startsWith("**") && token.endsWith("**")) {
    tokens.push(
      { type: "plain", text: "**" },
      { type: "strong", text: token.slice(2, -2) },
      { type: "plain", text: "**" },
    );
    return;
  }

  if (token.startsWith("*") && token.endsWith("*")) {
    tokens.push(
      { type: "plain", text: "*" },
      { type: "emphasis", text: token.slice(1, -1) },
      { type: "plain", text: "*" },
    );
    return;
  }

  tokens.push({ type: fallbackType, text: token });
}
