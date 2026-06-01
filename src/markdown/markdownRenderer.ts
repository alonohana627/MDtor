import DOMPurify from "dompurify";
import { renderMarkdownToRawHtml } from "./markdownRendererCore";

export function renderMarkdownToHtml(markdown: string): string {
  return sanitizeMarkdownHtml(renderMarkdownToRawHtml(markdown));
}

export function sanitizeMarkdownHtml(renderedHtml: string): string {
  return DOMPurify.sanitize(renderedHtml, {
    ALLOW_UNKNOWN_PROTOCOLS: false,
    USE_PROFILES: { html: true },
  });
}
