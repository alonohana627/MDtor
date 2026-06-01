# Changelog

## 0.3.0

- Improved large-document editing responsiveness by moving active editing to CodeMirror, deferring preview/outline/stat rendering away from the keystroke path, and adding large-document performance coverage.
- Improved large-document selection responsiveness by letting CodeMirror own cursor and selection behavior and avoiding preview/outline work on the immediate input path.
- Replaced the active editor with CodeMirror 6 and the active preview renderer with worker-assisted, sanitized `markdown-it` HTML plus `highlight.js` core code highlighting, task lists, and footnotes.
- Removed the remaining custom Markdown block parser and export inline parser; outline and export now derive structure from `markdown-it` tokens.
- Adjusted preview code syntax highlighting colors for a clearer `highlight.js` palette.
- Restored preview/editor correlation highlighting by adding source-line metadata to rendered Markdown and marking the preview block that contains the editor cursor line.

## 0.2.2

- Added writer-focused tools: live document statistics, an outline sidebar, adjustable editor/preview split, Zen Mode, Typewriter Mode, file rename, recent projects, local image preview, and PDF/DOCX/HTML export.
- Improved outline navigation with an independent outline scrollbar, reliable editor caret placement, preview scrolling to the selected heading, and coupled editor/preview scrolling.
- Replaced the editor ruled-line gradient with a repeated hard 1px line.
- Decoupled editor and preview scrolling by default, with a persisted top-right scroll-sync toggle next to the shortened `L` / `D` theme control. When enabled, sync follows direct scroll deltas instead of ratio-based top/bottom positioning.
- Fixed textarea caret placement in the syntax-highlighted Markdown editor by keeping highlight tokens color-only so the visible text and native caret use matching font metrics.
- Preserved DOCX links as real Word hyperlink relationships during export.
- Further split project workspace behavior into action and helper modules and set the local coverage thresholds to 90% across statements, branches, functions, and lines.
- Split workspace helper behavior into focused core, file-operation, lifecycle, and type modules.
- Added Markdown link URL allowlisting and a Tauri CSP so unsafe link schemes are not rendered as clickable anchors.
- Fixed browser folder picker cancellation so it behaves like a no-op instead of surfacing an error.
- Fixed project polling so an externally deleted active file switches to a fallback file or clears the editor state.
- Added a browser-safe `Ctrl+Alt+Right` / `Cmd+Option+Right` next-file shortcut alongside `Ctrl+Tab` / `Cmd+Tab`.
- Fixed light-mode code block highlighting to use the light Shiki theme.
- Replaced the full Shiki bundle import with a curated lazy-loaded language/theme highlighter.
- Disabled the open-folder button while workspace actions are busy.
- Added generated browser project ids so active-file persistence does not collide for folders with the same display name.
- Aligned package, Cargo, Tauri, lockfile, and changelog versions at `0.2.2`.

## 0.2.1

### Features

- Added keyboard shortcuts for project workflows: `Ctrl+S` / `Cmd+S` saves, `Ctrl+O` / `Cmd+O` opens a folder, `Ctrl+N` / `Cmd+N` creates a Markdown file, `Ctrl+P` / `Cmd+P` opens the quick file switcher, and `Ctrl+Tab` / `Cmd+Tab` switches to the next Markdown file.
- Added last-active-file restore for reopened project folders.
- Added a keyboard quick switcher for Markdown files.
- Improved editor focus after opening, switching, creating, and deleting files.
- Simplified the React app shell by extracting project workflow state and helpers out of `App.tsx`.
- Updated README usage docs and added `ARCHITECTURE.md` for code structure, workflow, persistence, and testing details.
- Added a local-only `npm run test:coverage` command with V8 coverage reports and global coverage thresholds.

## 0.1.1

### Features

- Added folder-based Markdown project support with recursive Markdown file discovery, a simple active-file sidebar, instant file switching, autosave before switching files, manual save, and visible dirty-state markers.
- Added document direction controls for LTR and RTL writing, with editor and preview direction updates and preview code blocks kept left-to-right.
- Added Tauri commands for scoped Markdown project scanning, file reading, and file saving.
- Replaced manual project path entry with the native Tauri folder picker.
- Added a browser-mode guard so project folder opening reports that the native picker requires the Tauri desktop runtime instead of throwing a bridge error.
- Added browser-native folder opening and saving via the File System Access API for supported browsers.
- Moved the Tauri/Vite development server port from 1420 to 1422 to avoid the occupied-port failure.
- Added Markdown file creation for opened projects.
- Added manual sidebar reordering controls for project files.
- Removed the browser upload-folder fallback so browser mode only uses true open-folder APIs; Firefox now reports that direct local folder editing requires the Tauri desktop app or a browser with `showDirectoryPicker`.
- Added one-second project folder polling so externally created or removed Markdown files appear in the sidebar while preserving manual file order for existing entries.
- Added right-click deletion for Markdown files in the project sidebar.
- Added last-opened project folder persistence for Tauri and supported browser folder handles.

### Fixed

- Fixed Markdown file creation in new nested subfolders for Tauri projects.
- Fixed browser project file creation so existing empty files are rejected instead of being silently accepted.
- Added browser project path validation before creating or deleting files.

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
