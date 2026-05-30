import { bench, describe } from "vitest";
import { makeMarkdownDocument } from "./fixtures";
import { parseMarkdown } from "../../src/markdown/parseMarkdown";
import { renderInlineMarkdown } from "../../src/markdown/renderInlineMarkdown";

const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const large = makeMarkdownDocument(1000);

describe("markdown parser", () => {
  bench("parse small markdown", () => {
    parseMarkdown(small);
  });

  bench("parse medium markdown", () => {
    parseMarkdown(medium);
  });

  bench("parse large markdown", () => {
    parseMarkdown(large);
  });
});

describe("inline markdown renderer", () => {
  bench("render bold/italic/link/inline-code", () => {
    renderInlineMarkdown(
      "Text with **bold**, *italic*, [link](https://example.com), and `code`.",
    );
  });
});
