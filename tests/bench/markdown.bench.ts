import { bench, describe } from "vitest";
import { makeMarkdownDocument } from "./fixtures";
import { renderMarkdownToHtml } from "../../src/markdown/markdownRenderer";
import { getMarkdownOutline } from "../../src/markdown/outline";

const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const large = makeMarkdownDocument(1000);

describe("markdown-it outline", () => {
  bench("build small outline", () => {
    getMarkdownOutline(small);
  });

  bench("build medium outline", () => {
    getMarkdownOutline(medium);
  });

  bench("build large outline", () => {
    getMarkdownOutline(large);
  });
});

describe("markdown-it renderer", () => {
  bench("render bold/italic/link/inline-code html", () => {
    renderMarkdownToHtml(
      "Text with **bold**, *italic*, [link](https://example.com), and `code`.",
    );
  });

  bench("render large markdown html", () => {
    renderMarkdownToHtml(large);
  });
});
