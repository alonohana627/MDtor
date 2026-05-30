# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Snapshot

MDtor is a Tauri 2 + React 19 + TypeScript + Rust Markdown editor. It opens real
project folders, edits `.md` / `.markdown` files directly, renders a live
preview, supports browser File System Access API mode where available, and uses
Tauri commands for native desktop filesystem access.

Use the local `tauri-react-rust-md-expert` skill for work that touches React,
Tauri, Rust, npm tooling, Markdown rendering, file persistence, or packaging.

## First Steps

1. Check the worktree before editing:

   ```bash
   git status --short
   ```

2. Read the smallest relevant files before changing behavior. Good starting
   points are:
   - `README.md` for user-facing behavior and scripts.
   - `ARCHITECTURE.md` for module boundaries.
   - `src/hooks/useProjectWorkspace.ts` and nearby workspace modules for project
     workflows.
   - `src/services/` for Tauri, browser filesystem, persistence, and syntax
     highlighter boundaries.
   - `src-tauri/src/lib.rs` for native filesystem commands.

3. Preserve unrelated dirty changes. Do not revert or overwrite user changes
   unless explicitly asked.

## Engineering Rules

- Prefer the existing architecture over adding new patterns.
- Keep behavior in the layer that owns it:
  - React components own rendering and user interaction.
  - Hooks own workspace workflow coordination.
  - `src/services/` owns IO boundaries and persistence.
  - Rust Tauri commands own native filesystem behavior.
  - `src/markdown/` owns parsing, highlighting, and inline rendering.
- Browser folder access must use the File System Access API. Firefox cannot open
  writable local folders from a plain web app, so keep the desktop Tauri path as
  the native-folder solution.
- Tauri command payloads should stay typed, serializable, and stable.
- Keep Markdown security explicit. Link rendering is allowlisted; do not broaden
  it without tests and documentation.
- Do not broaden Tauri permissions, CSP, filesystem scope, shell access, or
  network access just to make a feature pass.
- Use structured parsers or existing Markdown helpers for Markdown behavior. Do
  not add nontrivial Markdown parsing with ad hoc regex.
- Update `CHANGELOG.md` for user-visible features, behavior changes, fixes, and
  shortcuts.
- Update `README.md`, `ARCHITECTURE.md`, or `src/markdown/README.md` when public
  behavior or architecture changes.
- Keep coverage tooling local only. Do not add coverage reporting or coverage
  checks to CI.

## Editing Standards

- Use `apply_patch` for manual edits.
- Keep files ASCII unless the existing file intentionally uses other characters.
- Add comments sparingly, only where they explain non-obvious logic.
- Prefer focused helpers and small modules over growing large hooks or
  components.
- Add tests for new behavior and for bug fixes. Use deterministic mocks around
  Tauri `invoke`, browser filesystem handles, timers, and persistence.

## Common Commands

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Run the desktop app:

```bash
npm run tauri dev
```

Validate frontend changes:

```bash
npm run lint
npm test
npm run build
```

Check local coverage:

```bash
npm run test:coverage
```

Validate Rust/Tauri command changes:

```bash
cargo test
```

Run Rust commands from `src-tauri/` unless the command explicitly supports the
workspace root.

## Testing Expectations

- Component tests live in `tests/unit/components`.
- Hook/workspace tests live in `tests/unit/hooks`.
- Markdown parser/rendering tests live in `tests/unit/markdown`.
- Service boundary tests live in `tests/unit/services`.
- Rust command tests live under `src-tauri`.

For narrow changes, run the targeted test file first, then run the relevant
broader command. Before handing off substantial changes, prefer:

```bash
npm run lint
npm run test:coverage
npm run build
cargo test
```

## Release And Version Notes

When bumping the app version, keep these files aligned:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`

See `HowToBumpVersion.md` for the manual checklist.

## Known Product Constraints

- `Ctrl+Tab` switches Markdown files, with `Ctrl+Alt+Right` /
  `Cmd+Option+Right` as the browser-safe alternate.
- Project polling rescans open folders once per second and preserves manual
  sidebar ordering while appending newly discovered files.
- If the active file disappears outside the app, the workspace should switch to
  another file or clear the editor when none remain.
- Browser project persistence is best effort and depends on browser directory
  handle permissions.
- Shiki syntax highlighting uses a curated lazy-loaded language and theme set in
  `src/services/codeHighlighter.ts`.
