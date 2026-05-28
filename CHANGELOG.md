# Changelog

## 0.1.0

Initial Markdown editor and previewer release.

### Features

- Split-screen Markdown workspace with an editor pane on the left and rendered preview pane on the right.
- Live preview updates while typing.
- Basic Markdown block parsing for headings, paragraphs, blockquotes, ordered lists, unordered lists, and fenced code blocks.
- Inline Markdown rendering for bold text, italic text, inline code, and links.
- Markdown hard line-break support using two trailing spaces before a newline.
- Editor line-number gutter synced with textarea scrolling.
- Current editor line indicator in the Markdown pane header.
- Editor-side Markdown syntax highlighting for headings, list markers, quotes, code fences, code blocks, inline code, bold, italic, and links.
- Preview-side source-line highlighting that bolds/highlights the rendered block matching the active editor line.
- Per-list-item preview highlighting when the active editor line is inside a Markdown list.
- Light and dark theme toggle in the top-right corner.
- Theme-aware editor, preview, syntax-token, and code-block colors.
- Shiki-powered syntax highlighting for fenced preview code blocks.
- Code-block language aliases for common fence labels such as `ts`, `js`, `rs`, `sh`, `py`, `md`, `c++`, and `c#`.
- Plain-text fallback for unsupported code-block languages.
- Modular React structure for editor, preview, Markdown parsing, inline rendering, editor highlighting, theme toggle, and Shiki code highlighting.
- Markdown parser documentation in `src/markdown/README.md`.
