# MDtor 0.2.2 - Writer Experience & Export Features

## Goal

Improve MDtor as a writing tool by focusing on usability, navigation, exporting, and long-document workflows.

This release should prioritize making the editor more pleasant and efficient to use rather than adding new Markdown syntax support.

# PDF Export

## Description

Allow users to export the currently open Markdown document as a PDF file.

## Requirements

- Export the active document.
- Preserve document structure.
- Preserve:
  - headings
  - paragraphs
  - lists
  - blockquotes
  - code blocks
- Prompt for save location.
- Generated PDF should not depend on the current application theme.
- Export should work entirely offline.

## User Value

Provides a ready-to-share format for articles, essays, notes, and books.

# DOCX Export

## Description

Allow exporting the current document as a Microsoft Word document.

## Requirements

- Export the active document.
- Preserve heading hierarchy.
- Preserve lists.
- Preserve code blocks.
- Preserve links.
- Prompt for save location.

## User Value

Allows users to continue editing documents in Microsoft Word, LibreOffice, or Google Docs.

# HTML Export

## Description

Allow exporting rendered Markdown as a standalone HTML document.

## Requirements

- Export rendered content.
- Include styling within the generated file.
- Open correctly without external dependencies.
- Preserve syntax highlighting where possible.

## User Value

Useful for publishing articles, documentation, and static websites.

# Outline Sidebar

## Description

Generate a live navigation outline from document headings.

## Requirements

- Display all headings.
- Reflect heading hierarchy.
- Update automatically while editing.
- Clicking an item jumps to the corresponding section.
- Highlight the currently visible section.
- Keep the outline scroll independent from the coupled editor/preview scroll.
- Keep editor and preview scrolling independent by default, with a visible
  toggle for users who want coupled scrolling.
- When coupled scrolling is enabled, preserve the user's native scroll speed by
  syncing scroll deltas rather than mapping by top/bottom ratio.
- Keep editor and preview jumping together after outline clicks.

## User Value

Makes navigation significantly easier for large documents.

# Adjustable Split Layout

## Description

Allow users to resize the editor and preview panes.

## Requirements

- Add a draggable divider.
- Persist chosen layout.
- Support:
  - Editor wider than preview
  - Preview wider than editor
  - Equal split

## User Value

Different workflows require different workspace layouts.

# Zen Mode

## Description

Provide a distraction-free writing environment.

## Requirements

- Hide project sidebar.
- Hide header controls.
- Maximize writing area.
- Toggle using a keyboard shortcut.
- Preserve editor and preview functionality.

## User Value

Improves focus during long writing sessions.

# File Rename

## Description

Allow renaming Markdown files directly from the project sidebar.

## Requirements

- Rename existing Markdown files.
- Update project state immediately.
- Keep currently opened file active after rename.
- Prevent invalid names.

## User Value

Completes the basic file-management workflow.

# Local Image Preview

## Description

Render local images referenced from Markdown files.

## Requirements

- Support relative image paths.
- Display images inside preview.
- Gracefully handle missing files.
- Refresh when image references change.

## User Value

Essential for documentation and book-writing workflows.

# Word Count

## Description

Provide live document statistics.

## Requirements

Display:

- Word count
- Character count
- Estimated reading time

Update automatically while editing.

## User Value

Important for writers, students, and technical authors.

# Recent Projects

## Description

Track recently opened project folders.

## Requirements

- Store recently opened projects.
- Display recent projects list.
- Allow reopening projects with one click.
- Remove inaccessible projects automatically.

## User Value

Reduces friction when switching between projects.

# Typewriter Mode

## Description

Keep the active writing line vertically centered within the editor.

## Requirements

- Follow cursor movement.
- Smooth scrolling behavior.
- Avoid queued smooth-scroll animations in large documents.
- Toggle independently from Zen Mode.

## User Value

Creates a focused writing experience for long-form content.

# Large Document Editing

## Description

Keep the basic writing loop responsive in long Markdown files.

## Requirements

- Typing, deleting, scrolling, and cursor movement should stay responsive in
  documents with hundreds or thousands of lines.
- Preview rendering, outline updates, statistics, line numbers, syntax
  highlighting, and editor overlays must not block text input.
- Editor-side highlighting should avoid rendering full-document overlay DOM for
  large documents.
- Cursor-line tracking should avoid expensive string allocations while editing.
- The blinking textarea cursor should align with the visible highlighted text;
  editor syntax tokens should not change font metrics.
- Text selection should remain native and should not drive full preview or
  outline rerenders.
- Add regression tests and targeted benchmarks for large-document editor paths.

## User Value

Large articles, essays, documentation, and book chapters remain editable without
the app freezing or the cursor becoming unreliable.

# Success Criteria

A user should be able to:

- Open a project instantly from recent projects.
- Navigate large documents using an outline.
- Write in a distraction-free environment.
- Resize the workspace to fit their workflow.
- View local images directly in preview.
- Rename files without leaving the editor.
- Monitor writing progress through live statistics.
- Export documents to PDF, DOCX, and HTML.
- Edit large Markdown documents without cursor lag, freezes, or full-overlay
  rendering stalls.

The release should make MDtor feel like a dedicated writing application rather than a Markdown demonstration editor.
