import { parseMarkdown } from "./parseMarkdown";

export type OutlineItem = {
  id: string;
  level: number;
  text: string;
  line: number;
};

function slugifyHeading(text: string) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function getMarkdownOutline(markdown: string): OutlineItem[] {
  const seen = new Map<string, number>();

  return parseMarkdown(markdown)
    .filter((block) => block.type === "heading")
    .map((block) => {
      const baseId = slugifyHeading(block.text);
      const count = seen.get(baseId) ?? 0;
      seen.set(baseId, count + 1);

      return {
        id: count === 0 ? baseId : `${baseId}-${count + 1}`,
        level: block.level,
        text: block.text,
        line: block.source.startLine,
      };
    });
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
