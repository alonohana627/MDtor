import type Token from "markdown-it/lib/token.mjs";
import { createHeadingSlugger, slugifyHeading } from "./headingSlugs";
import { getMarkdownTokens } from "./markdownRendererCore";

export type OutlineItem = {
  id: string;
  level: number;
  text: string;
  line: number;
};

export { slugifyHeading };

export function getMarkdownOutline(markdown: string): OutlineItem[] {
  const slugHeading = createHeadingSlugger();
  const tokens = getMarkdownTokens(markdown);
  const outline: OutlineItem[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type !== "heading_open" || !token.map) {
      continue;
    }

    const inlineToken = tokens[index + 1];
    const text = inlineToken ? getTokenText(inlineToken) : "";
    const level = Number(token.tag.replace("h", ""));

    outline.push({
      id: slugHeading(text),
      level: Number.isFinite(level) ? level : 1,
      text,
      line: token.map[0] + 1,
    });
  }

  return outline;
}

export function getActiveOutlineItem(
  outline: OutlineItem[],
  currentLine: number,
): OutlineItem | null {
  let activeItem: OutlineItem | null = null;

  for (const item of outline) {
    if (item.line > currentLine) {
      break;
    }

    activeItem = item;
  }

  return activeItem;
}

function getTokenText(token: Token): string {
  if (token.children) {
    return token.children.map(getTokenText).join("");
  }

  if (
    token.type === "text" ||
    token.type === "code_inline" ||
    token.type === "emoji" ||
    token.type === "image"
  ) {
    return token.content;
  }

  if (token.type === "softbreak" || token.type === "hardbreak") {
    return " ";
  }

  return "";
}
