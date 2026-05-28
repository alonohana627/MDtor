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

export function highlightMarkdown(markdown: string): MarkdownToken[][] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let inCodeBlock = false;

  return lines.map((line) => {
    const fence = line.match(/^(\s*```)([^\s`]*)?(.*)$/);

    if (fence) {
      inCodeBlock = !inCodeBlock;

      return [
        { type: "code-fence", text: fence[1] },
        { type: "code-language", text: fence[2] ?? "" },
        { type: "plain", text: fence[3] ?? "" },
      ];
    }

    if (inCodeBlock) {
      return [{ type: "code-text", text: line }];
    }

    const heading = line.match(/^(#{1,6})(\s+)(.*)$/);
    if (heading) {
      return [
        { type: "heading-marker", text: heading[1] },
        { type: "plain", text: heading[2] },
        { type: "heading-text", text: heading[3] },
      ];
    }

    const quote = line.match(/^(\s*> ?)(.*)$/);
    if (quote) {
      return [
        { type: "quote-marker", text: quote[1] },
        ...highlightInline(quote[2], "quote-text"),
      ];
    }

    const list = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/);
    if (list) {
      return [{ type: "list-marker", text: list[1] }, ...highlightInline(list[2])];
    }

    return highlightInline(line);
  });
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
