function createRepeatedSection(index: number) {
  return [
    `## Section ${index}`,
    "",
    `Paragraph ${index} with **bold text**, *italic text*, [a link](https://example.com/${index}), and \`inline code\`.`,
    "",
    "- First item",
    "- Second item",
    "- Third item",
    "",
    "```ts",
    `const value${index} = ${index};`,
    "```",
  ].join("\n");
}

export const smallMarkdown = [
  "# Small Document",
  "",
  "A short paragraph with **bold** text.",
  "",
  "- one",
  "- two",
  "",
  "```ts",
  "const value = 1;",
  "```",
].join("\n");

export const mediumMarkdown = [
  "# Medium Document",
  "",
  Array.from({ length: 80 }, (_, index) => createRepeatedSection(index + 1)).join("\n\n"),
].join("\n");

export const largeMarkdown = [
  "# Large Document",
  "",
  Array.from({ length: 900 }, (_, index) => createRepeatedSection(index + 1)).join(
    "\n\n",
  ),
].join("\n");
