import { describe, expect, it } from "vitest";
import { getDocumentStats } from "../../../src/markdown/documentStats";

describe("getDocumentStats", () => {
  it("counts words, characters, and reading time without Markdown markers", () => {
    const markdown = "# Title\n\nA **bold** [linked phrase](https://example.com).";

    expect(getDocumentStats(markdown)).toEqual({
      words: 5,
      characters: markdown.length,
      readingMinutes: 1,
    });
  });

  it("keeps reading time at a minimum of one minute", () => {
    expect(getDocumentStats("")).toEqual({
      words: 0,
      characters: 0,
      readingMinutes: 1,
    });
  });
});
