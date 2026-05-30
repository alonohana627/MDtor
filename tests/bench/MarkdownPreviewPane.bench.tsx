import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { MarkdownPreviewPane } from "../../src/components/MarkdownPreviewPane";
import { makeMarkdownDocument } from "./fixtures";

vi.mock("../../src/components/MarkdownPreview", () => ({
  MarkdownPreview: ({ markdown }: { markdown: string }) => (
    <div data-testid="markdown-preview">{markdown}</div>
  ),
}));

const empty = "";
const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const large = makeMarkdownDocument(1000);

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderMarkdownPreviewPane(markdown: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <MarkdownPreviewPane
        markdown={markdown}
        currentLine={1}
        theme="light"
        direction="ltr"
        onPreviewScroll={vi.fn()}
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

describe("MarkdownPreviewPane render", () => {
  bench("render empty preview pane", () => {
    renderMarkdownPreviewPane(empty);
  });

  bench("render small preview pane", () => {
    renderMarkdownPreviewPane(small);
  });

  bench("render medium preview pane", () => {
    renderMarkdownPreviewPane(medium);
  });

  bench("render large preview pane", () => {
    renderMarkdownPreviewPane(large);
  });
});
