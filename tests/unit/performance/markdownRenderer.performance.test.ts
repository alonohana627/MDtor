import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../../../src/markdown/markdownRenderer";
import {
  largeMarkdown,
  mediumMarkdown,
  smallMarkdown,
} from "../../../src/performance/markdownFixtures";

function expectRenderedMarkdown(html: string) {
  const container = document.createElement("div");

  container.innerHTML = html;

  expect(container.querySelector("h1")).not.toBeNull();
  expect(container.querySelector("li")).not.toBeNull();
  expect(container.querySelector("pre code")).toHaveClass("hljs");
  expect(container.querySelector("[data-source-line]")).not.toBeNull();
  expect(container.querySelector("script")).toBeNull();
}

describe("markdown renderer performance guardrail", () => {
  it("renders the small fixture", () => {
    expectRenderedMarkdown(renderMarkdownToHtml(smallMarkdown));
  });

  it("renders the medium fixture", () => {
    expectRenderedMarkdown(renderMarkdownToHtml(mediumMarkdown));
  });

  it("renders the large fixture", () => {
    expectRenderedMarkdown(renderMarkdownToHtml(largeMarkdown));
  });

  it("keeps sanitized output safe for injected scripts", () => {
    const html = renderMarkdownToHtml(`${smallMarkdown}\n\n<script>alert(1)</script>`);

    expect(html).not.toContain("<script");
  });
});
