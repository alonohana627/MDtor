# Agent — Replace Custom Markdown Editor Stack With Fast Libraries

You are refactoring MDtor for performance.

Goal: replace the custom Markdown processor, custom editor/highlight overlay, custom preview block renderer, and custom code highlighter with efficient maintained libraries.

Implement one step only at a time.

After each step, run only the validation command listed in that step.

Do not run dev, tauri dev, tauri build, lint, format, or unrelated commands.

Do not rewrite unrelated code.

Do not change Tauri file/project behavior unless a step explicitly says so.

Do not change the existing public app behavior except where replacing the implementation requires it.

Keep RTL/LTR support:

- Markdown prose follows the selected document direction.
- Code blocks remain LTR.
- Inline code remains LTR.
- Line numbers remain readable.

Current custom pieces to remove or bypass:

- MarkdownHighlightLayer
- custom textarea overlay highlighting
- custom Markdown block parser
- custom inline Markdown renderer
- custom code block highlighting logic
- custom preview block component tree when no longer needed

Preferred libraries:

- CodeMirror 6 for the editor
- @codemirror/lang-markdown for Markdown language support
- markdown-it for Markdown rendering
- markdown-it-anchor if headings need anchors
- markdown-it-task-lists if task lists are needed
- markdown-it-footnote if footnotes are needed
- DOMPurify for sanitized preview HTML
- highlight.js/lib/core with selected languages only

Validation command for most steps:

    npm run build

Use:

    npm test

only for test-specific steps.

# Step 1 — Add Replacement Dependencies

Install the editor/rendering libraries.

Add runtime dependencies:

    codemirror
    @codemirror/state
    @codemirror/view
    @codemirror/commands
    @codemirror/language
    @codemirror/search
    @codemirror/autocomplete
    @codemirror/lang-markdown
    markdown-it
    markdown-it-anchor
    markdown-it-task-lists
    markdown-it-footnote
    dompurify
    highlight.js

Add dev dependencies if TypeScript needs them:

    @types/markdown-it

Rules:

- Do not add Monaco.
- Do not add Slate.
- Do not add Draft.
- Do not add Lexical.
- Do not add ProseMirror directly.
- Do not add MDXEditor.
- Do not add React Markdown for this pass.

Validation:

    npm run build

# Step 2 — Create Markdown Renderer Adapter

Create:

    src/markdown/markdownRenderer.ts

Implement a single exported function:

    renderMarkdownToHtml(markdown: string): string

Requirements:

- Instantiate markdown-it once at module scope.
- Enable CommonMark-compatible Markdown behavior.
- Enable linkify only if existing behavior supports autolinks.
- Enable typographer only if existing behavior supports it.
- Add markdown-it-task-lists if task list syntax is expected.
- Add markdown-it-footnote if footnotes are expected.
- Add markdown-it-anchor only if heading anchors are desired.
- Use highlight.js/lib/core, not the full highlight.js bundle.
- Register only common languages initially:
  - javascript
  - typescript
  - jsx/tsx if available through the JS/TS highlighter setup
  - json
  - css
  - html/xml
  - bash
  - markdown
- If a fenced code language is unknown, escape the code and render it without highlighting.
- Return sanitized HTML using DOMPurify.
- Keep raw HTML disabled unless the existing app explicitly supports raw HTML.

Security:

- Never return unsanitized HTML.
- Never call dangerouslySetInnerHTML with unsanitized Markdown output.

Validation:

    npm run build

# Step 3 — Replace Preview Internals With Fast HTML Rendering

Update:

    src/components/MarkdownPreview/MarkdownPreview.tsx
    src/components/MarkdownPreviewPane/MarkdownPreviewPane.tsx

Behavior:

- MarkdownPreview accepts:
  - markdown
  - direction
- MarkdownPreviewPane passes markdown and direction through.
- MarkdownPreview calls renderMarkdownToHtml(markdown).
- Memoize rendered HTML with useMemo.
- Render sanitized HTML using dangerouslySetInnerHTML.
- Preview root gets dir={direction}.
- Code blocks stay LTR.
- Inline code stays LTR.

CSS requirements:

- `.markdown-preview` follows selected direction.
- `.markdown-preview pre`
- `.markdown-preview code`
- `.markdown-preview kbd`
- `.markdown-preview samp`

must use:

    direction: ltr;
    text-align: left;
    unicode-bidi: isolate;

Rules:

- Remove use of the custom MarkdownBlockView from the main preview path.
- Remove use of custom renderInlineMarkdown from the main preview path.
- Do not delete old files yet unless build/tests prove they are unused.
- Prefer bypassing first, deleting later.

Validation:

    npm run build

# Step 4 — Add Preview Render Debounce

Update:

    src/components/MarkdownPreview/MarkdownPreview.tsx

Goal:
Avoid re-rendering Markdown on every keystroke synchronously.

Behavior:

- Keep immediate editor typing responsive.
- Debounce Markdown rendering by 75–150ms.
- Render the latest markdown only.
- Ignore stale renders.
- Keep the previous preview visible while the next render is pending.
- Do not show loading spinners while typing.

Implementation options:

- useDeferredValue if already on React 18+.
- Or local debounced state with useEffect.
- Keep implementation simple.

Validation:

    npm run build

# Step 5 — Create CodeMirror Markdown Editor Component

Create:

    src/components/CodeMirrorMarkdownEditor/CodeMirrorMarkdownEditor.tsx
    src/components/CodeMirrorMarkdownEditor/CodeMirrorMarkdownEditor.css
    src/components/CodeMirrorMarkdownEditor/index.ts

Props:

    type CodeMirrorMarkdownEditorProps = {
      value: string;
      direction: "ltr" | "rtl";
      onChange: (value: string) => void;
    };

Requirements:

- Use CodeMirror 6 directly.
- Use EditorView.
- Use EditorState.
- Use basicSetup from codemirror.
- Use markdown from @codemirror/lang-markdown.
- Use markdownLanguage as the base if GFM-like Markdown behavior is desired.
- Use EditorView.updateListener.
- Call onChange only when update.docChanged is true.
- Use EditorView.lineWrapping.
- Set content DOM dir using EditorView.contentAttributes.
- Set outer editor dir/class using EditorView.editorAttributes if needed.
- Keep editor height 100%.
- Destroy EditorView on unmount.
- Do not recreate the EditorView on every keystroke.
- When the external value changes because of file switching, dispatch a document replacement only if value differs from the current CodeMirror document.

RTL/LTR:

- For LTR, text aligns left.
- For RTL, prose aligns right.
- Code fences inside the editor can remain visually sane; do not over-engineer fenced block direction in this step.
- Line numbers must remain readable.

Validation:

    npm run build

# Step 6 — Replace MarkdownEditor Implementation

Update:

    src/components/MarkdownEditor/MarkdownEditor.tsx

Goal:
Keep the public MarkdownEditor import stable, but replace its internals.

Behavior:

- MarkdownEditor becomes a thin wrapper around CodeMirrorMarkdownEditor.
- Preserve existing props used by App.tsx.
- Continue accepting direction.
- Continue calling the existing onChange handler.
- Remove textarea usage from the active path.
- Remove MarkdownHighlightLayer usage from the active path.

Rules:

- Do not delete MarkdownHighlightLayer files yet.
- Do not rewrite App.tsx unless prop names force it.
- Keep existing CSS class names where practical to avoid layout breakage.

Validation:

    npm run build

# Step 7 — Remove Custom Highlight Overlay From Layout

Update any affected files:

    src/components/MarkdownEditor/MarkdownEditor.tsx
    src/components/MarkdownEditor/MarkdownEditor.css
    src/components/MarkdownHighlightLayer/MarkdownHighlightLayer.tsx
    src/components/MarkdownHighlightLayer/MarkdownHighlightLayer.css

Goal:
The editor must no longer render a textarea plus synchronized highlight overlay.

Requirements:

- No scroll-sync code between textarea and overlay.
- No duplicate Markdown text DOM layer.
- No custom token rendering for editor highlighting.
- CodeMirror owns syntax highlighting, cursor, selection, line wrapping, and scrolling.
- MarkdownHighlightLayer may remain in the repo only if tests still import it.
- If unused, remove the component and index export.

Validation:

    npm run build

# Step 8 — Replace Custom Code Block Renderer

Update:

    src/components/HighlightedCodeBlock/HighlightedCodeBlock.tsx

Goal:
Stop using custom code highlighting logic.

Acceptable outcomes:

1. Component becomes unused because Markdown preview is rendered from markdown-it HTML.
2. Component remains only as a compatibility wrapper for tests or old imports.

Requirements if component remains:

- It must not contain custom syntax parsing.
- It must either:
  - render pre-highlighted HTML from the markdown renderer, or
  - use highlight.js core with registered languages.
- Root stays dir="ltr".
- Text aligns left.
- Unknown languages render escaped plain text.

Validation:

    npm run build

# Step 9 — Delete Dead Markdown Parser Code

Search for old custom parser/rendering functions.

Likely targets:

- renderInlineMarkdown
- MarkdownBlockView
- MarkdownHighlightLayer
- custom heading/list/blockquote parsing helpers
- custom fenced code parsing helpers
- custom inline bold/italic/link parsing helpers

Rules:

- Delete only files/functions with zero live imports.
- If tests still cover deleted behavior, update tests to assert rendered user-visible behavior instead of implementation details.
- Do not delete project/file/sidebar code.
- Do not delete DirectionToggle.

Validation:

    npm run build

# Step 10 — Add Markdown Renderer Tests

Create:

    tests/unit/markdown/markdownRenderer.test.ts

Test:

- renders headings
- renders paragraphs
- renders bold
- renders italic
- renders links
- renders unordered lists
- renders ordered lists
- renders blockquotes
- renders fenced code blocks
- renders inline code
- preserves code as LTR-compatible HTML/CSS target
- sanitizes unsafe HTML/script/event handlers
- renders task lists if plugin enabled
- renders footnotes if plugin enabled

Rules:

- Test behavior, not internal markdown-it token structure.
- Do not snapshot giant HTML strings.
- Use focused assertions.

Validation:

    npm test

# Step 11 — Add CodeMirror Editor Tests

Create:

    tests/unit/components/CodeMirrorMarkdownEditor.test.tsx

Test:

- renders editor
- displays initial value
- calls onChange when text changes
- applies LTR direction
- applies RTL direction
- does not call onChange when only props rerender without document change

Rules:

- Keep tests minimal.
- Do not test CodeMirror internals.
- Test your adapter behavior only.

Validation:

    npm test

# Step 12 — Optional Worker Preview Rendering

Implement this step only if typing still stutters on large Markdown files.

Create:

    src/markdown/markdown.worker.ts
    src/markdown/useMarkdownRenderWorker.ts

Goal:
Move Markdown rendering off the main UI thread.

Behavior:

- Worker receives:
  - markdown
  - requestId
- Worker returns:
  - requestId
  - html
- Main thread ignores stale requestIds.
- Keep previous preview HTML visible while worker renders.
- Debounce worker requests.
- Terminate worker on unmount.

Rules:

- markdown-it and highlight.js can run in the worker.
- DOMPurify may need to run on the main thread depending on environment compatibility.
- If DOMPurify cannot safely run in the worker, sanitize returned HTML on the main thread before rendering.
- Do not introduce async race bugs on file switching.

Validation:

    npm run build

# Step 13 — Performance Guardrail

Create:

    src/performance/markdownFixtures.ts

Add three fixture strings:

- smallMarkdown
- mediumMarkdown
- largeMarkdown

Create:

    tests/unit/performance/markdownRenderer.performance.test.ts

Goal:
Catch obvious regressions, not produce perfect benchmarks.

Test:

- renderMarkdownToHtml(smallMarkdown) completes successfully
- renderMarkdownToHtml(mediumMarkdown) completes successfully
- renderMarkdownToHtml(largeMarkdown) completes successfully
- rendered output contains expected heading/list/code markers
- sanitized output does not contain script tags

Rules:

- Do not make timing assertions unless the test environment is stable.
- This is a correctness/perf-smoke test, not a microbenchmark.

Validation:

    npm test

# Step 14 — Final Cleanup

Remove dead files if unused:

- MarkdownHighlightLayer
- MarkdownBlockView
- custom inline Markdown renderer
- custom Markdown tokenizer/parser helpers
- custom code highlighter helpers
- old CSS used only by textarea overlay

Keep:

- ProjectSidebar
- DirectionToggle
- ThemeToggle
- Tauri project API
- file open/save behavior
- dirty state behavior

Validation:

    npm run build

# Final Check

Run:

    npm test

Then:

    npm run build

Required result:

- Editor uses CodeMirror 6.
- No textarea overlay/highlight layer remains in active editor path.
- Markdown preview uses markdown-it.
- Preview HTML is sanitized.
- Code highlighting uses library code, not custom parsing.
- Code blocks remain LTR.
- Inline code remains LTR.
- Document direction still works.
- File switching still works.
- Dirty state still works.
- Save still works.
- Typing is visibly smoother on medium and large Markdown documents.
