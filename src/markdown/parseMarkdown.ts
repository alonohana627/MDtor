import { MarkdownBlock, MarkdownListItem } from "./types";

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const parser = new MarkdownParser(markdown);

  return parser.parse();
}

class MarkdownParser {
  private readonly lines: string[];
  private readonly blocks: MarkdownBlock[] = [];
  private paragraph: string[] = [];
  private paragraphStartLine = 0;
  private paragraphEndLine = 0;
  private listItems: MarkdownListItem[] = [];
  private listOrdered = false;
  private codeLines: string[] | null = null;
  private codeLanguage = "";
  private codeStartLine = 0;

  constructor(markdown: string) {
    this.lines = markdown.replace(/\r\n/g, "\n").split("\n");
  }

  parse() {
    for (const [index, line] of this.lines.entries()) {
      this.consumeLine(line, index + 1);
    }

    this.closeOpenCodeBlock();
    this.flushParagraph();
    this.flushList();

    return this.blocks;
  }

  private consumeLine(line: string, lineNumber: number) {
    const trimmed = line.trim();
    const fence = trimmed.match(/^```([^\s`]*)\s*$/);

    if (this.codeLines) {
      this.consumeCodeLine(line, fence, lineNumber);
      return;
    }

    if (fence) {
      this.openCodeBlock(fence[1] ?? "", lineNumber);
      return;
    }

    if (!trimmed) {
      this.flushParagraph();
      this.flushList();
      return;
    }

    if (this.consumeHeading(trimmed, lineNumber)) return;
    if (this.consumeListItem(trimmed, lineNumber)) return;
    if (this.consumeBlockquote(trimmed, lineNumber)) return;

    this.flushList();
    if (this.paragraph.length === 0) {
      this.paragraphStartLine = lineNumber;
    }
    this.paragraphEndLine = lineNumber;
    this.paragraph.push(this.createParagraphLine(line, trimmed));
  }

  private consumeCodeLine(
    line: string,
    fence: RegExpMatchArray | null,
    lineNumber: number,
  ) {
    if (fence) {
      this.closeOpenCodeBlock(lineNumber);
      return;
    }

    this.codeLines?.push(line);
  }

  private openCodeBlock(language: string, lineNumber: number) {
    this.flushParagraph();
    this.flushList();
    this.codeLines = [];
    this.codeLanguage = language;
    this.codeStartLine = lineNumber;
  }

  private closeOpenCodeBlock(endLine = this.lines.length) {
    if (!this.codeLines) return;

    this.blocks.push({
      type: "code",
      language: this.codeLanguage,
      code: this.codeLines.join("\n"),
      source: {
        startLine: this.codeStartLine,
        endLine,
      },
    });
    this.codeLines = null;
    this.codeLanguage = "";
    this.codeStartLine = 0;
  }

  private consumeHeading(trimmed: string, lineNumber: number) {
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (!heading) return false;

    this.flushParagraph();
    this.flushList();
    this.blocks.push({
      type: "heading",
      level: heading[1].length,
      text: heading[2],
      source: {
        startLine: lineNumber,
        endLine: lineNumber,
      },
    });

    return true;
  }

  private consumeListItem(trimmed: string, lineNumber: number) {
    const unorderedItem = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedItem = trimmed.match(/^\d+\.\s+(.+)$/);
    if (!unorderedItem && !orderedItem) return false;

    this.flushParagraph();

    const ordered = Boolean(orderedItem);
    if (this.listItems.length > 0 && this.listOrdered !== ordered) {
      this.flushList();
    }

    this.listOrdered = ordered;
    this.listItems.push({
      text: (orderedItem ?? unorderedItem)?.[1] ?? "",
      line: lineNumber,
    });

    return true;
  }

  private consumeBlockquote(trimmed: string, lineNumber: number) {
    const quote = trimmed.match(/^>\s?(.+)$/);
    if (!quote) return false;

    this.flushParagraph();
    this.flushList();
    this.blocks.push({
      type: "blockquote",
      text: quote[1],
      source: {
        startLine: lineNumber,
        endLine: lineNumber,
      },
    });

    return true;
  }

  private flushParagraph() {
    if (this.paragraph.length === 0) return;

    this.blocks.push({
      type: "paragraph",
      text: this.paragraph.join(" ").replace(/\n /g, "\n"),
      source: {
        startLine: this.paragraphStartLine,
        endLine: this.paragraphEndLine,
      },
    });
    this.paragraph = [];
    this.paragraphStartLine = 0;
    this.paragraphEndLine = 0;
  }

  private createParagraphLine(line: string, trimmed: string) {
    const hasHardBreak = / {2,}$/.test(line);

    return hasHardBreak ? `${trimmed}\n` : trimmed;
  }

  private flushList() {
    if (this.listItems.length === 0) return;

    this.blocks.push({
      type: "list",
      ordered: this.listOrdered,
      items: this.listItems,
      source: {
        startLine: this.listItems[0].line,
        endLine: this.listItems[this.listItems.length - 1].line,
      },
    });
    this.listItems = [];
  }
}
