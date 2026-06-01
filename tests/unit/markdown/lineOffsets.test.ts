import { describe, expect, it } from "vitest";
import { getLineStartOffset } from "../../../src/markdown/lineOffsets";

describe("getLineStartOffset", () => {
  it("returns bounded line start offsets", () => {
    const markdown = "one\ntwo\nthree";

    expect(getLineStartOffset(markdown, 0)).toBe(0);
    expect(getLineStartOffset(markdown, 1)).toBe(0);
    expect(getLineStartOffset(markdown, 2)).toBe(4);
    expect(getLineStartOffset(markdown, 3)).toBe(8);
    expect(getLineStartOffset(markdown, 99)).toBe(markdown.length);
  });
});
