# MDtor

MDtor is a Tauri + React Markdown editor with a live preview and real folder
editing. It opens a project folder, discovers Markdown files recursively, and
lets you write, preview, create, reorder, and delete `.md` / `.markdown` files.

The app is currently focused on long-form writing workflows: fast file switching,
line-aware preview highlighting, outline navigation, export, RTL/LTR direction
controls, and persistence for recent projects and active files.

## Features

- Split-screen Markdown editor and rendered preview.
- Live preview while typing.
- Editor line numbers synced with textarea scrolling.
- Current editor line indicator and preview block highlighting.
- Independent editor and preview scrolling with an optional sync toggle.
- LTR and RTL document direction controls.
- Light and dark mode toggle.
- Responsive large-document editing with virtualized editor-side Markdown
  highlighting.
- Preview-side fenced code-block syntax highlighting with Shiki.
- Live word count, character count, and reading-time estimate.
- Live outline sidebar generated from document headings.
- Adjustable editor/preview split layout.
- Zen Mode and Typewriter Mode for focused writing.
- PDF, DOCX, and standalone HTML export.
- Folder-based Markdown projects with recursive file discovery.
- Native folder picking in the Tauri desktop app.
- Browser folder opening and saving in browsers that support the File System
  Access API.
- Markdown file creation, rename, right-click deletion, manual sidebar ordering,
  and automatic folder rescans while a project is open.
- Local image preview for relative Markdown image references.
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
- Images: `![alt](relative/path.png)`
- Hard line breaks using two trailing spaces before a newline

Link handling:

- Preview links only render as clickable links for `http:`, `https:`, and
  `mailto:` targets. Other schemes are rendered as inert text.

Known limitations:

- No nested lists yet.
- No tables yet.
- Images are previewed for relative local paths inside the open project.
- No raw HTML rendering.
- No full CommonMark compliance.

See [src/markdown/README.md](src/markdown/README.md) for parser and editor
highlighting details.

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
- [src/markdown/README.md](src/markdown/README.md): Markdown parser and editor
  highlighting internals.
- [HowToBumpVersion.md](HowToBumpVersion.md): manual version bump checklist.
- [CHANGELOG.md](CHANGELOG.md): release history.

## Testing

Unit tests live under `tests/unit` and cover Markdown parsing/rendering, React
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

## Notes

Shiki uses a curated lazy-loaded language/theme set for preview code blocks.
The C++ grammar is still relatively large, but it is isolated from the main app
bundle.
