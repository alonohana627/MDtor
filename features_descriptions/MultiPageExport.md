# Feature Update — Each Exported File Starts On A New Page

Add this requirement to Multi-File Export.

Behavior:

- Every selected Markdown file starts on a fresh document page.
- Insert a page break before each file except the first selected file.
- Do not merely add spacing between files.
- Do not rely on empty lines to simulate page separation.
- Page breaks must be real DOCX page breaks.
- If exporting through HTML/print/PDF, page breaks must use real print page-break rules.

Example:

- `a.md` starts on page 1.
- If `a.md` ends halfway through page 2, `b.md` starts on page 3.
- `b.md` never starts immediately after `a.md` on the same page.

Acceptance:

- Exporting `a.md`, `b.md`, `c.md` creates one document.
- Files are ordered alphabetically.
- Each file begins on a new page.
- Long files still flow naturally across multiple pages.
- The exported content remains rendered Markdown, not raw Markdown.
- Preview styling is preserved as closely as possible.

Validation:

Run only:

    npm test

Then:

    npm run build
