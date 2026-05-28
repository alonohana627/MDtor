import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../../../src/markdown/parseMarkdown";

describe("parseMarkdown", () => {
  it("parses headings with source line metadata", () => {
    expect(parseMarkdown("# Title")).toEqual([
      {
        type: "heading",
        level: 1,
        text: "Title",
        source: { startLine: 1, endLine: 1 },
      },
    ]);
  });

  it("groups paragraph lines and preserves hard line breaks", () => {
    expect(parseMarkdown("first line  \nsecond line")).toEqual([
      {
        type: "paragraph",
        text: "first line\nsecond line",
        source: { startLine: 1, endLine: 2 },
      },
    ]);
  });

  it("creates separate paragraph blocks around blank lines", () => {
    expect(parseMarkdown("one\n\ntwo")).toEqual([
      {
        type: "paragraph",
        text: "one",
        source: { startLine: 1, endLine: 1 },
      },
      {
        type: "paragraph",
        text: "two",
        source: { startLine: 3, endLine: 3 },
      },
    ]);
  });

  it("parses unordered and ordered lists with per-item source lines", () => {
    expect(parseMarkdown("- one\n- two\n\n1. three\n2. four")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          { text: "one", line: 1 },
          { text: "two", line: 2 },
        ],
        source: { startLine: 1, endLine: 2 },
      },
      {
        type: "list",
        ordered: true,
        items: [
          { text: "three", line: 4 },
          { text: "four", line: 5 },
        ],
        source: { startLine: 4, endLine: 5 },
      },
    ]);
  });

  it("splits adjacent lists when the list type changes", () => {
    expect(parseMarkdown("- one\n1. two")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [{ text: "one", line: 1 }],
        source: { startLine: 1, endLine: 1 },
      },
      {
        type: "list",
        ordered: true,
        items: [{ text: "two", line: 2 }],
        source: { startLine: 2, endLine: 2 },
      },
    ]);
  });

  it("parses blockquotes", () => {
    expect(parseMarkdown("> quoted")).toEqual([
      {
        type: "blockquote",
        text: "quoted",
        source: { startLine: 1, endLine: 1 },
      },
    ]);
  });

  it("parses fenced code blocks and keeps markdown-looking code as code", () => {
    expect(parseMarkdown("```ts\n# not a heading\n- not a list\n```")).toEqual([
      {
        type: "code",
        language: "ts",
        code: "# not a heading\n- not a list",
        source: { startLine: 1, endLine: 4 },
      },
    ]);
  });

  it("supports non-word fence language names", () => {
    expect(parseMarkdown("```c++\nint main() {}\n```")).toEqual([
      {
        type: "code",
        language: "c++",
        code: "int main() {}",
        source: { startLine: 1, endLine: 3 },
      },
    ]);
  });

  it("closes an unclosed code block at the end of the document", () => {
    expect(parseMarkdown("```rust\nlet value = 1;")).toEqual([
      {
        type: "code",
        language: "rust",
        code: "let value = 1;",
        source: { startLine: 1, endLine: 2 },
      },
    ]);
  });
});
