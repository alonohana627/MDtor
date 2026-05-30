# Bugs

## Export

- PDF, Word, and HTML exports do not faithfully preserve Markdown formatting.
- Exported documents can lose heading hierarchy, nested list structure, and other semantic information.
- PDF exports are generated as a continuous document instead of a properly paginated document.

## RTL

- Pressing Space in RTL mode can cause the caret to jump to the beginning of the paragraph.
- Documents containing both RTL and LTR content can exhibit inconsistent cursor movement and text insertion behavior.

## Keyboard Shortcuts

- Keyboard shortcuts stop working when the active keyboard layout is Hebrew.
- Shortcut detection depends on the produced character instead of the physical key location.

## Project Scanning

- Directories such as `.git`, `node_modules`, `target`, and `dist` are scanned unnecessarily.
- Large projects can become noticeably slower to open because of unnecessary traversal.
- Symbolic link handling is undefined and can lead to unexpected behavior.
