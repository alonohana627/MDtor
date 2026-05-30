export function makeMarkdownDocument(lines: number) {
  return Array.from({ length: lines }, (_, index) => {
    return [
      `# Heading ${index}`,
      "",
      `Paragraph ${index} with **bold**, *italic*, [link](https://example.com), and \`inline code\`.`,
      "",
      "```ts",
      `const value${index} = ${index};`,
      "```",
      "",
      `- item ${index}`,
      `- item ${index + 1}`,
      "",
      `> quote ${index}`,
    ].join("\n");
  }).join("\n\n");
}

export function makeProjectFiles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    path: `/project/docs/file-${index}.md`,
    relativePath: `docs/file-${index}.md`,
    name: `file-${index}.md`,
  }));
}
