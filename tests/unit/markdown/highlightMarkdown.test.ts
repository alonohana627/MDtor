import { describe, expect, it } from "vitest";
import { highlightMarkdown } from "../../../src/markdown/highlightMarkdown";

describe("highlightMarkdown", () => {
  it("highlights heading markers separately from heading text", () => {
    expect(highlightMarkdown("## Title")).toEqual([
      [
        { type: "heading-marker", text: "##" },
        { type: "plain", text: " " },
        { type: "heading-text", text: "Title" },
      ],
    ]);
  });

  it("highlights list markers and inline tokens in list text", () => {
    expect(highlightMarkdown("- **bold** and `code`")).toEqual([
      [
        { type: "list-marker", text: "- " },
        { type: "plain", text: "**" },
        { type: "strong", text: "bold" },
        { type: "plain", text: "**" },
        { type: "plain", text: " and " },
        { type: "inline-code", text: "`code`" },
      ],
    ]);
  });

  it("highlights blockquotes while preserving quote text style", () => {
    expect(highlightMarkdown("> a *quote*")).toEqual([
      [
        { type: "quote-marker", text: "> " },
        { type: "quote-text", text: "a " },
        { type: "plain", text: "*" },
        { type: "emphasis", text: "quote" },
        { type: "plain", text: "*" },
      ],
    ]);
  });

  it("highlights links as bracket, text, url, and paren tokens", () => {
    expect(highlightMarkdown("[Tauri](https://tauri.app)")).toEqual([
      [
        { type: "plain", text: "[" },
        { type: "link-text", text: "Tauri" },
        { type: "plain", text: "](" },
        { type: "link-url", text: "https://tauri.app" },
        { type: "plain", text: ")" },
      ],
    ]);
  });

  it("treats fenced code contents as code text until the closing fence", () => {
    expect(highlightMarkdown("```ts\n# not heading\n```")).toEqual([
      [
        { type: "code-fence", text: "```" },
        { type: "code-language", text: "ts" },
        { type: "plain", text: "" },
      ],
      [{ type: "code-text", text: "# not heading" }],
      [
        { type: "code-fence", text: "```" },
        { type: "code-language", text: "" },
        { type: "plain", text: "" },
      ],
    ]);
  });

  it("preserves one empty plain token for blank lines", () => {
    expect(highlightMarkdown("")).toEqual([[{ type: "plain", text: "" }]]);
  });
});
