import MarkdownIt, { type Options } from "markdown-it";
import type Renderer from "markdown-it/lib/renderer.mjs";
import type Token from "markdown-it/lib/token.mjs";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import { slugifyHeading } from "./headingSlugs";
import { highlightCodeToHtml, renderHighlightedCodeBlockHtml } from "./codeHighlighting";

const safeLinkProtocols = new Set(["http:", "https:", "mailto:"]);

const markdownRenderer = new MarkdownIt("commonmark", {
  html: false,
  linkify: false,
  typographer: false,
  highlight: highlightCode,
})
  .use(markdownItTaskLists, {
    enabled: false,
    label: true,
    labelAfter: true,
  })
  .use(markdownItFootnote)
  .use(markdownItAnchor, {
    slugify: slugifyHeading,
  });

const defaultLinkOpenRenderer = markdownRenderer.renderer.rules.link_open;

markdownRenderer.validateLink = isSafeMarkdownHref;
for (const tokenType of [
  "heading_open",
  "paragraph_open",
  "blockquote_open",
  "bullet_list_open",
  "ordered_list_open",
  "list_item_open",
]) {
  markdownRenderer.renderer.rules[tokenType] = renderSourceMappedToken;
}
markdownRenderer.renderer.rules.fence = renderCodeBlock;
markdownRenderer.renderer.rules.code_block = renderCodeBlock;
markdownRenderer.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = token.attrGet("href");

  if (href && isSafeMarkdownHref(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noreferrer");
  }

  return defaultLinkOpenRenderer
    ? defaultLinkOpenRenderer(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};

export function renderMarkdownToRawHtml(markdown: string): string {
  return markdownRenderer.render(markdown);
}

export function getMarkdownTokens(markdown: string) {
  return markdownRenderer.parse(markdown, {});
}

function highlightCode(code: string, languageName: string) {
  return highlightCodeToHtml(code, languageName);
}

function renderCodeBlock(tokens: Token[], index: number) {
  const token = tokens[index];

  return renderHighlightedCodeBlockHtml(
    token.content,
    token.info,
    getSourceLineHtmlAttributes(token),
  );
}

function renderSourceMappedToken(
  tokens: Token[],
  index: number,
  options: Options,
  _env: unknown,
  self: Renderer,
) {
  addSourceLineAttributes(tokens[index]);

  return self.renderToken(tokens, index, options);
}

function addSourceLineAttributes(token: Token) {
  if (!token.map) {
    return;
  }

  token.attrSet("data-source-line", String(token.map[0] + 1));
  token.attrSet("data-source-end-line", String(token.map[1]));
}

function getSourceLineHtmlAttributes(token: Token) {
  if (!token.map) {
    return "";
  }

  return ` data-source-line="${token.map[0] + 1}" data-source-end-line="${token.map[1]}"`;
}

function isSafeMarkdownHref(href: string) {
  const trimmedHref = href.trim();

  if (!/^[a-z][a-z\d+.-]*:/i.test(trimmedHref)) {
    return false;
  }

  try {
    const url = new URL(trimmedHref);

    return safeLinkProtocols.has(url.protocol.toLowerCase());
  } catch {
    return false;
  }
}
