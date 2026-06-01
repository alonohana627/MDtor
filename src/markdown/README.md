# Markdown Rendering

The active preview, outline, and export paths use maintained Markdown libraries.

```text
raw Markdown text
  -> useMarkdownRenderWorker()
  -> markdown-it in a Web Worker when available
  -> highlight.js core for fenced code
  -> DOMPurify on the main thread
  -> sanitized preview HTML
```

## Active Files

- `markdownRendererCore.ts`: Owns Markdown-to-HTML rendering, link policy,
  heading anchors, task lists, footnotes, and code highlighting.
- `markdownRenderer.ts`: Owns final HTML sanitization.
- `markdown.worker.ts` and `useMarkdownRenderWorker.ts`: Move expensive preview
  rendering off the main thread when Web Workers are available, then sanitize
  the returned HTML before React renders it.
- `codeHighlighting.ts`: Registers the selected `highlight.js/lib/core`
  languages and escapes unsupported fenced code.
- `outline.ts`: Builds the outline from `markdown-it` heading tokens and uses
  the same slug function as preview heading anchors.
- `exportMarkdown.ts`: Uses `markdown-it` HTML rendering for standalone HTML
  export and `markdown-it` tokens for PDF/DOCX content extraction.

## Security

Raw HTML is disabled in `markdown-it`, and `renderMarkdownToHtml()` always
sanitizes output with DOMPurify before React renders it with
`dangerouslySetInnerHTML`.

Worker-rendered preview HTML is sanitized on the main thread before insertion.

Clickable Markdown links are restricted to `http:`, `https:`, and `mailto:`.
Unsafe schemes are left as text by the renderer.

## Direction

Preview prose follows the selected document direction. Code-oriented elements
such as `pre`, `code`, `kbd`, and `samp` are styled as LTR targets in
`MarkdownPreview.css`.
