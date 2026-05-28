# MDtor

MDtor is a Tauri + React Markdown editor with a live preview. It is built as a
desktop app shell with a Vite frontend, TypeScript, React components, a small
custom Markdown parser, and Shiki-powered code highlighting.

In the future it will be a full-featured Markdown editor with support for CommonMark syntax,
file system integration, exporting to PDF or one HTML file, projects (based on folder), and more.

I will use it to write a philosophy book I've been planning for a while, and I hope it can be useful to others as well.

## Features

- Split-screen Markdown editor and rendered preview.
- Live preview while typing.
- Editor line numbers synced with textarea scrolling.
- Current editor line indicator.
- Preview block highlighting for the source line currently selected in the editor.
- Light and dark mode toggle.
- Editor-side Markdown syntax highlighting.
- Preview-side fenced code-block syntax highlighting with Shiki.
- Unit tests for Markdown logic and React components.
- ESLint and Prettier setup.

## Markdown Support

The app currently uses a small custom parser in `src/markdown`, not a full
Markdown engine.

Supported block syntax:

- Headings: `#`, `##`, up to `######`
- Paragraphs
- Blockquotes: `> quote`
- Ordered lists: `1. item`
- Unordered lists: `- item`, `* item`, `+ item`
- Fenced code blocks: triple backticks with optional language labels

Supported inline syntax:

- Bold: `**text**`
- Italic: `*text*`
- Inline code: `` `code` ``
- Links: `[label](https://example.com)`
- Hard line breaks using two trailing spaces before a newline

Known limitations:

- No nested lists yet.
- No tables yet.
- No images yet.
- No raw HTML rendering.
- No full CommonMark compliance.

See [src/markdown/README.md](src/markdown/README.md) for how the parser and
editor highlighting work.

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Shiki
- Vitest
- React Testing Library
- ESLint
- Prettier

## Getting Started

Install dependencies:

```bash
npm install
```

Run the Vite dev server:

```bash
npm run dev
```

Run through Tauri:

```bash
npm run tauri dev
```

Build the frontend:

```bash
npm run build
```

Build/package through Tauri:

```bash
npm run tauri build
```

## Scripts

```bash
npm run dev
```

Start the Vite development server.

```bash
npm run build
```

Type-check and build the frontend.

```bash
npm test
```

Run unit tests.

```bash
npm run lint
```

Run ESLint.

```bash
npm run lint:fix
```

Run ESLint with automatic fixes.

```bash
npm run format
```

Format files with Prettier.

```bash
npm run format:check
```

Check formatting without writing changes.

```bash
npm run preview
```

Preview the production Vite build.

```bash
npm run tauri
```

Run the Tauri CLI.

## Project Structure

```text
src/
  App.tsx
  App.css
  components/
    HighlightedCodeBlock/
    MarkdownBlockView/
    MarkdownEditor/
    MarkdownHighlightLayer/
    MarkdownPreview/
    MarkdownPreviewPane/
    ThemeToggle/
  data/
    starterMarkdown.ts
  markdown/
    parseMarkdown.ts
    renderInlineMarkdown.tsx
    highlightMarkdown.ts
    types.ts
    README.md
tests/
  setup.ts
  unit/
    components/
    markdown/
src-tauri/
```

### Important Areas

- `src/components/MarkdownEditor`: the editable Markdown pane, line numbers, and
  editor syntax-highlight overlay.
- `src/components/MarkdownPreview`: converts parsed Markdown blocks into the
  rendered preview.
- `src/components/HighlightedCodeBlock`: Shiki integration for fenced code
  blocks.
- `src/markdown/parseMarkdown.ts`: block-level Markdown parser.
- `src/markdown/renderInlineMarkdown.tsx`: inline Markdown renderer.
- `src/markdown/highlightMarkdown.ts`: tokenization for editor-side syntax
  highlighting.

## Testing

Unit tests live under `tests/unit`.

Markdown logic tests:

```text
tests/unit/markdown/
```

Component tests:

```text
tests/unit/components/
```

Run all tests:

```bash
npm test
```

## Formatting and Linting

Run lint:

```bash
npm run lint
```

Fix lint issues where possible:

```bash
npm run lint:fix
```

Format files:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

## Notes

Shiki currently loads broad language/theme support, which can produce large build
chunks. Vite may warn about chunk size during `npm run build`. That is expected
for the current implementation and can be optimized later by loading a curated
language/theme set.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
