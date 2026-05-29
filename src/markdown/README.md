# Markdown Parser

This folder has a small Markdown parser written for the preview pane.

It is not a full Markdown engine. It only understands the features listed in
`types.ts`: headings, paragraphs, quotes, lists, and code blocks. Inline styling
such as bold, italic, code, and links is handled separately in
`renderInlineMarkdown.tsx`.

For the broader application structure, project workflow, Tauri boundary, and
testing strategy, see [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## The Big Idea

A parser turns text into structured data.

For this app, the flow is:

```text
raw Markdown text
  -> parseMarkdown()
  -> MarkdownBlock[]
  -> MarkdownBlockView
  -> React elements
```

Example Markdown:

```md
# Hello

- One
- Two
```

Becomes data like this:

```ts
[
  {
    type: "heading",
    level: 1,
    text: "Hello",
    source: { startLine: 1, endLine: 1 },
  },
  {
    type: "list",
    ordered: false,
    items: [
      { text: "One", line: 3 },
      { text: "Two", line: 4 },
    ],
    source: { startLine: 3, endLine: 4 },
  },
];
```

React then renders that data as:

```html
<h1>Hello</h1>
<ul>
  <li>One</li>
  <li>Two</li>
</ul>
```

## File Roles

- `types.ts`: Defines the shapes the parser can output.
- `parseMarkdown.ts`: Reads the document line by line and creates blocks.
- `renderInlineMarkdown.tsx`: Turns inline markup inside text into React nodes.
- `highlightMarkdown.ts`: Creates syntax-highlight tokens for the editor itself.

## How `parseMarkdown.ts` Works

The parser reads one line at a time.

It keeps a few temporary buckets while reading:

- `blocks`: Finished Markdown blocks ready for rendering.
- `paragraph`: Lines that may become one paragraph.
- `listItems`: Lines that may become one list.
- `listOrdered`: Whether the current list is ordered or unordered.
- `codeLines`: Lines inside a fenced code block.
- `codeLanguage`: The language after the opening fence, like `ts` in ```ts.

When the parser knows a bucket is done, it "flushes" it into `blocks`.

For example, these lines:

```md
hello
world

# Title
```

Are handled like this:

1. `hello` goes into `paragraph`.
2. `world` also goes into `paragraph`.
3. The empty line means the paragraph is done.
4. `flushParagraph()` pushes `{ type: "paragraph", text: "hello world" }`.
5. `# Title` becomes a heading block.

## What "Consume" Means

Methods named `consumeSomething` try to handle the current line.

For example:

```ts
if (this.consumeHeading(trimmed)) return;
if (this.consumeListItem(trimmed)) return;
if (this.consumeBlockquote(trimmed)) return;
```

Each method returns:

- `true` if it recognized and handled the line.
- `false` if it did not match that kind of Markdown.

So the parser asks, in order:

1. Is this a heading?
2. Is this a list item?
3. Is this a quote?
4. If none matched, treat it as paragraph text.

## Why Code Blocks Are Special

Code blocks can contain text that looks like Markdown, but should not be parsed.

Example:

````md
```ts
# this is code, not a heading
- this is code, not a list
```
````

That is why `codeLines` changes the parser mode.

When `codeLines` is not `null`, the parser only looks for the closing ``` fence.
Everything else is copied into the code block as plain text.

## Block Parsing vs Inline Rendering

The parser only decides the big document blocks:

- heading
- paragraph
- blockquote
- list
- code block

Paragraph lines that end with two or more spaces keep a hard line break. That
matches Markdown's `<br>` rule:

```md
first line  
second line
```

The parser stores that paragraph text with a `\n`, and
`renderInlineMarkdown()` renders the `\n` as a `<br>`.

Inline rendering happens later.

For example:

```md
This is **bold** and `code`.
```

First becomes:

```ts
{ type: "paragraph", text: "This is **bold** and `code`." }
```

Then `renderInlineMarkdown()` turns `**bold**` into `<strong>` and `` `code` ``
into `<code>`.

Keeping these separate makes the code easier to change:

- Add a new block type in `parseMarkdown.ts`.
- Add a new inline style in `renderInlineMarkdown.tsx`.
- Add rendering for new block types in `MarkdownBlockView.tsx`.

Each block also keeps source line metadata. The editor sends the current cursor
line to the preview, and the preview highlights the block or list item whose
source range contains that line.

## Editor Highlighting

The editor uses a different path from the preview.

The preview turns Markdown into rendered HTML-like React elements. The editor
still needs a real `<textarea>` so typing, selection, copy, paste, undo, and
keyboard behavior stay native.

To get colors inside the editor, the UI uses two layers:

```text
MarkdownHighlightLayer  -> colored text, not editable
textarea                -> real input, transparent text, visible caret
```

Both layers use the same font, padding, line height, and scroll position. The
textarea remains the source of truth. `highlightMarkdown.ts` only creates tokens
for display.

Example:

```md
## Title with **bold**
```

Becomes tokens like:

```ts
[
  { type: "heading-marker", text: "##" },
  { type: "plain", text: " " },
  { type: "heading-text", text: "Title with **bold**" },
];
```

To add a new editor color rule:

1. Add or reuse a token type in `highlightMarkdown.ts`.
2. Teach `highlightMarkdown()` or `highlightInline()` how to create it.
3. Add a `.md-token-*` style in `MarkdownEditor.css`.

## Where To Change Things

To add tables, task lists, or images, start with these files:

1. Add a new type in `types.ts`.
2. Teach `parseMarkdown.ts` how to recognize that syntax.
3. Teach `MarkdownBlockView.tsx` how to render the new block.

To add inline features like strikethrough, images inside text, or better links:

1. Update `inlinePattern` in `renderInlineMarkdown.tsx`.
2. Add a matching render branch in `renderInlineMarkdown()`.

## Important Limitation

This parser is intentionally basic. Real Markdown has many edge cases:

- nested lists
- tables
- escaped characters
- HTML inside Markdown
- mixed inline styles
- links with parentheses
- Markdown inside quotes and list items

For a production Markdown editor, use a real Markdown library. This parser is
useful because it is small, readable, and easy to experiment with.
