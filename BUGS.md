# Bugs

## URGENT - Large Document Editing

- The editor becomes unstable when working with larger Markdown documents, around 400 lines or more.
- Large documents can cause the application to lag, freeze, crash, or become unresponsive during normal editing.
- Cursor behavior becomes unreliable in large documents, including jumps, incorrect placement, or delayed movement after typing.
- Typing, deleting, scrolling, and moving the cursor should remain responsive in large documents.
- Preview rendering, syntax highlighting, line numbers, and editor overlays must not block normal text input.
- The application should handle large Markdown files without degrading the basic editing experience.
- Tests should be implemented to simulate editing large documents and verify that the editor remains responsive and functional under these conditions.
- This is the highest-priority bug and should be fixed before anything else.
- After this is resolved, the next highest priority is to implement tests that ensure the editor can handle large documents without performance degradation or instability.
- And after that - performance tests and optimiaztion for the relevant code paths. Aggressive optimization should be prioritized, even if it results in more complex code, as long as it does not introduce new bugs or regressions. However, the code shuold be well-documented and well-written to explain the optimizations and ensure maintainability.

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
