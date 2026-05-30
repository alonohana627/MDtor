import { describe, expect, it } from "vitest";
import {
  highlightCodeToTokens,
  isSupportedCodeLanguage,
  type SupportedCodeLanguage,
} from "../../../src/services/codeHighlighter";

const supportedLanguages = [
  "cpp",
  "csharp",
  "javascript",
  "jsx",
  "markdown",
  "python",
  "ruby",
  "rust",
  "shellscript",
  "tsx",
  "typescript",
  "yaml",
] as const satisfies readonly SupportedCodeLanguage[];

describe("codeHighlighter", () => {
  it("recognizes only the curated language set", () => {
    expect(isSupportedCodeLanguage("typescript")).toBe(true);
    expect(isSupportedCodeLanguage("tsx")).toBe(true);
    expect(isSupportedCodeLanguage("unknownlang")).toBe(false);
  });

  it.each(supportedLanguages)(
    "highlights %s with the curated Shiki bundle",
    async (language) => {
      const result = await highlightCodeToTokens("value", language, "github-light");

      expect(
        result.tokens
          .flat()
          .map((token) => token.content)
          .join(""),
      ).toBe("value");
    },
  );

  it("loads the dark theme", async () => {
    const result = await highlightCodeToTokens("value", "typescript", "github-dark");

    expect(
      result.tokens
        .flat()
        .map((token) => token.content)
        .join(""),
    ).toBe("value");
  });
});
