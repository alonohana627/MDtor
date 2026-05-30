export type DocumentStats = {
  words: number;
  characters: number;
  readingMinutes: number;
};

const WORDS_PER_MINUTE = 225;

export function getDocumentStats(markdown: string): DocumentStats {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#-]/g, " ");
  const words = text.trim().match(/\S+/g)?.length ?? 0;
  const characters = markdown.length;

  return {
    words,
    characters,
    readingMinutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
  };
}
