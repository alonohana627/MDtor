# MDtor

MDtor is a Tauri + React Markdown editor with a live preview and real folder
editing. It opens a project folder, discovers Markdown files recursively, and
lets you write, preview, create, reorder, and delete `.md` / `.markdown` files.

The app is currently focused on long-form writing workflows: fast file switching,
outline navigation, PDF/DOCX export, RTL/LTR direction controls, and persistence
for recent projects and active files.

## Features

- Split-screen Markdown editor and rendered preview.
- Live preview while typing.
- CodeMirror 6 editor with Markdown language support, line numbers, selection,
  cursor movement, wrapping, and scrolling handled by the editor library.
- Current editor line indicator.
- Independent editor and preview scrolling with an optional sync toggle.
- LTR and RTL document direction controls.
- Light and dark mode toggle.
- Responsive large-document editing using CodeMirror and worker-assisted,
  debounced preview rendering.
- Preview-side fenced code-block syntax highlighting with `highlight.js` core.
- Live word count, character count, and reading-time estimate.
- Live outline sidebar generated from document headings.
- Adjustable editor/preview split layout.
- Zen Mode and Typewriter Mode for focused writing.
- Preview-faithful PDF and editable DOCX export for the active file or the
  whole project, with project files exported alphabetically and starting on
  fresh pages.
- Folder-based Markdown projects with recursive file discovery.
- Native folder picking in the Tauri desktop app.
- Browser folder opening and saving in browsers that support the File System
  Access API.
- Markdown file creation, rename, right-click deletion, manual sidebar ordering,
  and automatic folder rescans while a project is open.
- Active-file recovery when the currently open file is removed outside the app.
- Recent project reopening, last-opened project folder, and last-active-file
  restore.
- Keyboard shortcuts for common project workflows.

## Project Folders

MDtor opens a real folder and works directly with Markdown files inside it. The
sidebar keeps a manually ordered list of discovered files while the app rescans
the folder once per second, so files created or removed outside the app appear
without reopening the project.

In the desktop app, folder access uses Tauri's native folder picker and scoped
Rust commands. In browser mode, direct local folder editing requires the File
System Access API. Chrome and Edge support this; Firefox does not currently
support writable local folder opening from a web app, so Firefox users should use
the Tauri desktop app for native folder access.

## Shortcuts

| Shortcut                              | Action                                     |
| ------------------------------------- | ------------------------------------------ |
| `Ctrl+S` / `Cmd+S`                    | Save the active Markdown file              |
| `Ctrl+O` / `Cmd+O`                    | Open a project folder                      |
| `Ctrl+N` / `Cmd+N`                    | Create a Markdown file in the open project |
| `Ctrl+P` / `Cmd+P`                    | Open the quick file switcher               |
| `Ctrl+Tab` / `Cmd+Tab`                | Switch to the next Markdown file           |
| `Ctrl+Alt+Right` / `Cmd+Option+Right` | Browser-safe alternate next-file shortcut  |
| `Ctrl+Shift+M` / `Cmd+Shift+M`        | Toggle Zen Mode                            |

## Markdown Support

The live preview uses `markdown-it` for CommonMark-compatible Markdown rendering,
`highlight.js/lib/core` for selected fenced code languages, and DOMPurify before
rendering sanitized HTML. Large preview renders run in a Web Worker when the
browser/webview supports workers.

Supported block syntax:

- Headings: `#`, `##`, up to `######`
- Paragraphs
- Blockquotes: `> quote`
- Ordered lists: `1. item`
- Unordered lists: `- item`, `* item`, `+ item`
- Task lists: `- [x] done`
- Fenced code blocks: triple backticks with optional language labels
- Footnotes: `Text[^1]` plus `[^1]: note`

Supported inline syntax includes:

- Bold: `**text**`
- Italic: `*text*`
- Inline code: `` `code` ``
- Links: `[label](https://example.com)`
- Hard line breaks using two trailing spaces before a newline

Link handling:

- Preview links only render as clickable links for `http:`, `https:`, and
  `mailto:` targets. Other schemes are rendered as inert text.

Raw HTML rendering is disabled.

See [src/markdown/README.md](src/markdown/README.md) for rendering and
sanitization details.

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

| Command                    | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `npm run dev`              | Start the Vite development server        |
| `npm run build`            | Type-check and build the frontend        |
| `npm test`                 | Run unit tests                           |
| `npm run test:coverage`    | Run local unit test coverage             |
| `npm run test:performance` | Run local performance regression tests   |
| `npm run bench`            | Run Vitest benchmarks                    |
| `npm run lint`             | Run ESLint                               |
| `npm run lint:fix`         | Run ESLint with automatic fixes          |
| `npm run format`           | Format files with Prettier               |
| `npm run format:check`     | Check formatting without writing changes |
| `npm run preview`          | Preview the production Vite build        |
| `npm run tauri`            | Run the Tauri CLI                        |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): code structure, frontend/Tauri boundaries,
  project workflow, persistence, and testing strategy.
- [src/markdown/README.md](src/markdown/README.md): Markdown rendering and
  sanitization internals.
- [HowToBumpVersion.md](HowToBumpVersion.md): manual version bump checklist.
- [CHANGELOG.md](CHANGELOG.md): release history.

## Testing

Unit tests live under `tests/unit` and cover Markdown rendering/export, React
components, project services, persistence, and project workflow hooks.
Performance regression tests live under `tests/performance`, and benchmarks live
under `tests/bench` for local profiling of editor, preview, Markdown, and
workspace hot paths.

Run all tests:

```bash
npm test
```

Run local coverage:

```bash
npm run test:coverage
```

Coverage output is for local inspection only. It writes reports to `coverage/`,
which is ignored by Git and is not part of CI. The local coverage command enforces
global thresholds of 90% statements, 90% branches, 90% functions, and 90% lines.
