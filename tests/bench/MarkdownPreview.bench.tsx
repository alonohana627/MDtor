import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterAll, afterEach, beforeAll, bench, describe, vi } from "vitest";
import { MarkdownPreview } from "../../src/components/MarkdownPreview";
import { parseMarkdown } from "../../src/markdown/parseMarkdown";
import { makeMarkdownDocument } from "./fixtures";

vi.mock("../../src/components/HighlightedCodeBlock", () => ({
  HighlightedCodeBlock: ({
    code,
    language,
    sourceLine,
  }: {
    code: string;
    language: string;
    sourceLine?: number;
  }) => (
    <pre data-language={language} data-source-line={sourceLine}>
      <code>{code}</code>
    </pre>
  ),
}));

const empty = "";
const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const large = makeMarkdownDocument(1000);

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];
let previewUpdateRoot: Root | null = null;
let previewUpdateContainer: HTMLDivElement | null = null;
let previewUpdateLine = 100;

function renderMarkdownPreview(markdown: string, currentLine = 1) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <MarkdownPreview
        markdown={markdown}
        currentLine={currentLine}
        theme="light"
        direction="ltr"
      />,
    );
  });
}

beforeAll(() => {
  previewUpdateContainer = document.createElement("div");
  document.body.appendChild(previewUpdateContainer);
  previewUpdateRoot = createRoot(previewUpdateContainer);

  flushSync(() => {
    previewUpdateRoot?.render(
      <MarkdownPreview
        markdown={large}
        currentLine={100}
        theme="light"
        direction="ltr"
      />,
    );
  });
});

afterAll(() => {
  previewUpdateRoot?.unmount();
  previewUpdateContainer?.remove();
  previewUpdateRoot = null;
  previewUpdateContainer = null;
});

function updateLargeMarkdownPreviewCurrentLine() {
  previewUpdateLine = previewUpdateLine === 100 ? 2000 : 100;

  flushSync(() => {
    previewUpdateRoot?.render(
      <MarkdownPreview
        markdown={large}
        currentLine={previewUpdateLine}
        theme="light"
        direction="ltr"
      />,
    );
  });
}

afterEach(() => {
  for (const root of roots) {
    root.unmount();
  }

  for (const container of containers) {
    container.remove();
  }

  roots = [];
  containers = [];
});

describe("parseMarkdown", () => {
  bench("parse small markdown", () => {
    parseMarkdown(small);
  });

  bench("parse medium markdown", () => {
    parseMarkdown(medium);
  });

  bench("parse large markdown", () => {
    parseMarkdown(large);
  });
});

describe("MarkdownPreview render", () => {
  bench("render empty preview", () => {
    renderMarkdownPreview(empty);
  });

  bench("render small preview", () => {
    renderMarkdownPreview(small, 10);
  });

  bench("render medium preview", () => {
    renderMarkdownPreview(medium, 500);
  });

  bench("render large preview", () => {
    renderMarkdownPreview(large, 2000);
  });

  bench("update large preview active line", () => {
    updateLargeMarkdownPreviewCurrentLine();
  });
});
