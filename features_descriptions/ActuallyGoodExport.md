# Feature Direction: DOCX-First Export

Remove direct PDF export from scope.

MDtor should export to DOCX only.

Users who need PDF should export DOCX, open it in LibreOffice / Word, and print/export to PDF from there.

## Reason

PDF export is hard to make reliable without building a layout engine or trusting fragile browser-print behavior.

DOCX is the better export target because:

- it is editable
- it preserves document structure
- it can be reviewed and corrected before PDF
- Word / LibreOffice already solve printing and PDF generation
- it avoids maintaining a custom PDF algorithm
- it reduces export complexity

## Product Promise

MDtor exports a clean, professional DOCX document from Markdown.

PDF is produced outside MDtor through the office suite print/export flow.

## Required Behavior

Export DOCX must preserve:

- headings
- paragraphs
- bold
- italic
- inline code
- code blocks
- blockquotes
- ordered lists
- unordered lists
- links
- tables if supported by the Markdown renderer
- LTR / RTL document direction
- LTR code blocks inside RTL documents

## Non-Goals

Do not implement custom PDF export.

Do not implement browser-based PDF generation.

Do not build a pagination engine.

Do not try to make PDF output match preview directly.

Do not support many export formats.

## Export Flow

Markdown content
→ Markdown AST / parsed document
→ DOCX document model
→ saved .docx file

The DOCX should be semantic, not a screenshot and not dumped HTML.

## Acceptance Criteria

Given Markdown input:

    # Title

    שלום עולם

    - one
    - two

    ```ts
    const x = 1;
    ```

The exported DOCX must contain:

- real heading
- readable Hebrew text
- real list
- styled code block
- LTR code block
- editable text

The user can then open the DOCX in LibreOffice / Word and export/print to PDF.
