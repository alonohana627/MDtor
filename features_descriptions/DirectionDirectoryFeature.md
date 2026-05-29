# FEATURE — Book Projects + RTL/LTR Support

## Context

MDtor is no longer just a single-file Markdown playground.

The product direction is now:

> a serious long-form writing environment for books, essays, philosophy, research notes, and multi-document writing projects.

The editor must evolve from:

- one Markdown buffer

into:

- a folder-based writing workspace.

---

# Product Goals

MDtor should allow a user to:

- open a folder as a writing project
- navigate instantly between Markdown documents
- write books split across multiple files
- work naturally in both LTR and RTL languages
- preserve a clean distraction-free workflow

The experience should feel:

- lightweight
- instant
- native
- keyboard-oriented
- focused on writing

Not:

- IDE-like
- overloaded
- Electron-bloat-style
- file-manager-heavy

---

# Core User Story

A user opens a folder containing:

    introduction.md
    chapter-01.md
    chapter-02.md
    notes/philosophy.md

MDtor immediately shows:

- a sidebar with Markdown files
- the currently open file
- live preview
- instant switching between documents

The user can:

- click files
- edit them
- save them
- continue writing seamlessly

without leaving the editor.

---

# RTL / LTR Support

MDtor must support writing in:

- English
- Hebrew
- Arabic
- mixed-direction documents

The user can switch document direction between:

- LTR
- RTL

Direction affects:

- editor
- preview
- headings
- paragraphs
- lists
- blockquotes

Code always remains LTR.

The editor should feel natural for Hebrew philosophy writing.

---

# Sidebar Behavior

The sidebar represents the current project folder.

Requirements:

- show Markdown files only
- recursive folder scan
- display relative paths
- visually highlight active file
- instant file switching

The sidebar is not:

- a full file manager
- a Git panel
- a tree editor

Keep it simple.

---

# File Behavior

When a file is selected:

- its content loads instantly
- preview updates instantly
- current document becomes active

When switching files:

- dirty documents save automatically first

The app should preserve writing flow.

---

# Save Behavior

The user can manually save.

The UI must clearly indicate:

- current file
- unsaved changes

Example:

    chapter-01.md *

Unsaved state appears immediately after edits.

---

# Scope Constraints

Do NOT implement:

- tabs
- drag/drop reorder
- rename
- delete
- create file
- global search
- export system
- Git integration
- workspace metadata
- CommonMark rewrite
- collaborative editing
- cloud sync

This feature is strictly:

> folder-based multi-Markdown writing.

---

# UX Expectations

The app should feel:

- fast
- quiet
- minimal
- writing-focused

The workflow should resemble:

- Obsidian simplicity
- Typora smoothness
- Zed responsiveness

without becoming a knowledge-management system.

---

# Technical Constraints

The current architecture must remain intact:

- React
- Tauri
- current Markdown parser
- current preview system
- current syntax highlighting

Do not rewrite the Markdown engine.

Extend the current system incrementally.

---

# Agent Rules

Implement incrementally.

After EACH step run ONLY:

    npm run build

and:

    npm test

Do not continue if validation fails.

Do not run:

- dev
- tauri dev
- tauri build
- lint
- format

Each implementation step should:

- compile cleanly
- preserve existing behavior
- avoid unrelated refactors

---

# Completion Criteria

The feature is complete when:

1. User opens a folder.
2. Markdown files appear in sidebar.
3. User switches files instantly.
4. Editor updates correctly.
5. Preview updates correctly.
6. Dirty state works.
7. Save works.
8. RTL/LTR switching works.
9. Code blocks remain LTR.
10. Existing editor behavior remains stable.
