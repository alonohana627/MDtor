export function slugifyHeading(text: string) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function createHeadingSlugger() {
  const seen = new Map<string, number>();

  return (text: string) => {
    const baseId = slugifyHeading(text);
    const count = seen.get(baseId) ?? 0;

    seen.set(baseId, count + 1);

    return count === 0 ? baseId : `${baseId}-${count + 1}`;
  };
}
