# Architecture

MDtor is split into a React/Vite frontend and a Tauri 2 Rust backend. The
frontend owns editor state, rendering, keyboard workflows, and browser-mode file
access. The Rust backend owns native filesystem operations for the desktop app.

## Runtime Layers

```text
React UI
  -> project workflow hooks
  -> TypeScript services
  -> Tauri commands or browser File System Access API
  -> local Markdown files
```

### Frontend

- `src/App.tsx`: application shell. It wires theme/direction state, writer
  toolbar controls, export actions, split layout, outline navigation, and
  workspace state into the sidebar, editor, and preview panes.
- `src/components/`: presentational React components for the editor, preview,
  sidebar, theme toggle, code blocks, and Markdown block rendering.
- `src/hooks/`: workflow hooks that coordinate project state, polling, keyboard
  shortcuts, project lifecycle, file operations, and shared workspace state
  helpers.
- `src/services/`: IO boundaries for Tauri commands, browser filesystem handles,
  local persistence, and document export.
- `src/project/`: project source types and pure helper functions.
- `src/markdown/`: custom Markdown parser, inline renderer, editor highlighter,
  and parser types.
- `src/types.ts`: shared UI-level types such as theme and document direction.

### Tauri Backend

- `src-tauri/src/lib.rs`: Tauri command handlers for desktop project scanning,
  reading, saving, creating, and deleting Markdown files.
- `src-tauri/capabilities/default.json`: Tauri capability configuration.
- `src-tauri/tauri.conf.json`: app identity, build settings, and version.

The Rust command layer validates paths before touching files. Existing files are
resolved through canonical paths, and new files validate the nearest existing
ancestor so nested Markdown files can be created without escaping the project
folder.

## Project Workflow

Most project behavior is centralized in `useProjectWorkspace`.

It owns:

- current Markdown text and saved text
- dirty-state detection
- current cursor line
- active project source
- discovered Markdown file list
- active Markdown file path
- busy/error state
- editor focus restoration
- create/switch/save/delete/rename operations
- last project and last active file restoration

Supporting hooks and helper modules keep smaller concerns out of the workspace
hook:

- `useProjectPolling`: rescans the open project every second and reconciles
  external file changes with the current sidebar order. If the active file was
  deleted outside the app, the workspace switches to the next available file or
  clears the editor when no files remain.
- `useProjectKeyboardShortcuts`: handles `Ctrl` / `Cmd` project shortcuts.
- `useProjectWorkspaceActions`: exposes UI actions as callbacks.
- `workspaceCore`: shared load/save/read/persistence primitives.
- `workspaceFileOperations`: create, delete, rename, switch, reorder, and
  active-file fallback behavior.
- `workspaceProjectLifecycle`: open-folder and restore-project flows.

## Project Sources

The app supports two project source kinds:

```ts
type ProjectSource =
  | { kind: "tauri"; path: string }
  | { kind: "browser"; name: string; id: string };
```

Tauri projects use native folder paths and Rust commands. Browser projects use a
generated project id, a `FileSystemDirectoryHandle`, and a map of writable file
handles.

Browser folder opening is only available when `window.showDirectoryPicker`
exists. Firefox does not expose writable local folder access for web apps, so the
browser path reports a direct error and the desktop app remains the native-folder
option.

## File Ordering and Polling

Fresh scans return files sorted by path. Once a project is loaded, the sidebar
can be manually reordered. Polling reconciles later scans like this:

1. keep existing files that still exist, preserving manual order
2. remove files missing from the latest scan
3. append newly discovered files at the end

This keeps user ordering stable while still reflecting external file creation
and deletion.

## Persistence

`src/services/projectPersistence.ts` stores lightweight project continuity state:

- last Tauri project path in `localStorage`
- last active file per project in `localStorage`
- recent projects in `localStorage`
- adjustable split layout in `localStorage`
- last browser directory handle and generated browser project id in IndexedDB
  when the browser allows it

The browser directory handle persistence is best effort. If permission cannot be
restored, the app still runs and the user can open a folder manually. The
generated browser project id keeps active-file persistence from colliding when
different browser-opened folders share the same display name.

## Markdown Pipeline

The preview path is intentionally simple:

```text
markdown string
  -> parseMarkdown()
  -> MarkdownBlock[]
  -> MarkdownBlockView
  -> React elements
```

Inline Markdown rendering happens after block parsing. Editor highlighting uses a
separate tokenization path because the editor remains a native `<textarea>` for
selection, typing, paste, undo, and keyboard behavior.

Inline links are allowlisted before rendering. Only `http:`, `https:`, and
`mailto:` targets become anchors; unsupported schemes render as inert text.
Relative Markdown images are resolved through the active project file and loaded
through the Tauri or browser filesystem service boundary.

Document export is split between `src/services/documentExport.ts`, which owns
save-location prompts and Tauri/browser writes, and
`src/markdown/exportMarkdown.ts`, which converts parsed Markdown blocks into
standalone HTML, PDF bytes, and DOCX bytes.

Tauri also defines a CSP in `src-tauri/tauri.conf.json` so the desktop webview
does not run with CSP disabled.

See [src/markdown/README.md](src/markdown/README.md) for the parser details.

## Testing Strategy

Tests live in `tests/unit`.

- `tests/unit/markdown/`: parser, inline renderer, and editor highlighting logic.
- `tests/unit/components/`: React component rendering and interactions.
- `tests/unit/services/`: Tauri command payloads, browser folder/file behavior,
  and persistence.
- `tests/unit/project/`: pure project helpers.
- `tests/unit/hooks/`: project polling, keyboard shortcuts, and workspace
  workflows.

Tauri command wrappers are tested by mocking `invoke`. Browser file access is
tested with in-memory directory/file handle fakes. Workspace behavior is tested
with mocked Tauri and browser service boundaries so the tests stay deterministic.

Local coverage can be checked with `npm run test:coverage`. Coverage reports are
written to `coverage/` for local inspection only; CI intentionally runs the
normal test suite without coverage. The local coverage command enforces global
thresholds of 90% statements, 90% branches, 90% functions, and 90% lines.

## Build Notes

Shiki syntax highlighting is isolated behind `src/services/codeHighlighter.ts`.
It uses a curated lazy-loaded language/theme set instead of the full Shiki
bundle. C++ remains the largest optional grammar chunk, so Vite's local warning
threshold is set high enough for that intentional lazy chunk.
