import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterAll, afterEach, beforeAll, bench, describe } from "vitest";
import { MarkdownPreview } from "../../src/components/MarkdownPreview";
import { renderMarkdownToHtml } from "../../src/markdown/markdownRenderer";
import { makeMarkdownDocument } from "./fixtures";

const empty = "";
const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const largeMarkdown = makeMarkdownDocument(1000);
const largePreview = makeMarkdownDocument(300);

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];
let previewUpdateRoot: Root | null = null;
let previewUpdateContainer: HTMLDivElement | null = null;
let previewUpdateMarkdown = largePreview;

function renderMarkdownPreview(markdown: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <MarkdownPreview markdown={markdown} direction="ltr" currentLine={1} />,
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
        markdown={largePreview}
        direction="ltr"
        currentLine={1}
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

function updateLargeMarkdownPreviewMarkdown() {
  previewUpdateMarkdown =
    previewUpdateMarkdown === largePreview
      ? `${largePreview}\n\nextra`
      : largePreview;

  flushSync(() => {
    previewUpdateRoot?.render(
      <MarkdownPreview
        markdown={previewUpdateMarkdown}
        direction="ltr"
        currentLine={1}
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

describe("renderMarkdownToHtml", () => {
  bench("render small markdown html", () => {
    renderMarkdownToHtml(small);
  });

  bench("render medium markdown html", () => {
    renderMarkdownToHtml(medium);
  });

  bench("render large markdown html", () => {
    renderMarkdownToHtml(largeMarkdown);
  });
});

describe("MarkdownPreview render", () => {
  bench("render empty preview", () => {
    renderMarkdownPreview(empty);
  });

  bench("render small preview", () => {
    renderMarkdownPreview(small);
  });

  bench("render medium preview", () => {
    renderMarkdownPreview(medium);
  });

  bench("render large preview", () => {
    renderMarkdownPreview(largePreview);
  });

  bench("update large preview markdown", () => {
    updateLargeMarkdownPreviewMarkdown();
  });
});
