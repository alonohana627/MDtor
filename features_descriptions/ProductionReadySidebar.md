# Feature: Production-Ready ProjectSidebar

Repo context: MDtor already has folder-based Markdown projects, recursive file discovery, file creation/rename/delete, manual sidebar ordering, rescans, recent project restore, quick switching, and shortcuts. The new work must upgrade the ProjectSidebar into a polished production feature, not create a second project system. :contentReference[oaicite:0]{index=0}

## Goal

Make `ProjectSidebar` feel like a real editor sidebar.

It should be reliable, keyboard-friendly, visually clear, scalable for many files, and safe around dirty/open files.

## Required Behavior

### File Tree

- Show files as a proper nested tree by folder.
- Preserve current project file behavior.
- Keep `.md` and `.markdown` support.
- Sort folders before files.
- Sort names naturally and case-insensitively.
- Show empty folders only if they are useful for navigation.
- Collapse and expand folders.
- Persist expanded/collapsed folders per project.

### Active File

- Highlight the active file clearly.
- Keep the active file visible when switching files.
- Show dirty state beside the active file.
- Do not lose dirty state during rescans.
- If active file is deleted externally, use the existing recovery behavior.

### Actions

Support right-click/context actions:

- New file
- New folder
- Rename
- Delete
- Reveal in system file manager if Tauri supports it cleanly
- Refresh project

All destructive actions must be guarded.

### Keyboard

Support:

- Arrow up/down moves selection.
- Arrow right expands folder.
- Arrow left collapses folder or moves to parent.
- Enter opens selected file.
- F2 renames selected item.
- Delete asks for delete confirmation.
- Escape cancels rename/create mode.

### UX Quality

- Sidebar must be resizable.
- Width must persist.
- Add clear hover, active, focus, dirty, disabled, and drag states.
- Long paths should truncate cleanly.
- Use accessible labels and keyboard focus.
- Do not break RTL/LTR document editing.
- Sidebar UI itself can stay LTR unless the app already has global layout direction.

### Performance

Must work well with large projects.

Target:

- 100 Markdown files: smooth.
- 150 Markdown files: still usable.

Rules:

- Avoid recomputing tree structure on every keystroke.
- Memoize derived tree data.
- Do not rerender the whole sidebar when editor text changes.
- Use virtualization if rendering many visible rows becomes expensive.
- Keep rescans cheap and stable.

### Tests

Add or update tests for:

- tree building
- nested folders
- sorting
- active file highlight
- dirty marker
- empty state
- collapse/expand
- keyboard navigation
- rename mode
- delete confirmation path
- large-file-list rendering sanity

## Non-Goals

Do not rewrite the editor.

Do not replace CodeMirror.

Do not replace Markdown rendering.

Do not redesign the whole app shell.

Do not add tabs unless needed by existing architecture.

## Validation

Run:

    npm test

Then:

    npm run build

Both must pass.
