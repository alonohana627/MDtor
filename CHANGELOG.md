# Changelog

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
