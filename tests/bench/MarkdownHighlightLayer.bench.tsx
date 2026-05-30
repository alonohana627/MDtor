import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe } from "vitest";
import { MarkdownHighlightLayer } from "../../src/components/MarkdownHighlightLayer";
import { highlightMarkdown } from "../../src/markdown/highlightMarkdown";
import { makeMarkdownDocument } from "./fixtures";

const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const large = makeMarkdownDocument(1000);

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderMarkdownHighlightLayer(markdown: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(<MarkdownHighlightLayer markdown={markdown} />);
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

describe("highlightMarkdown", () => {
  bench("highlight small markdown", () => {
    highlightMarkdown(small);
  });

  bench("highlight medium markdown", () => {
    highlightMarkdown(medium);
  });

  bench("highlight large markdown", () => {
    highlightMarkdown(large);
  });
});

describe("MarkdownHighlightLayer render", () => {
  bench("render small highlight layer", () => {
    renderMarkdownHighlightLayer(small);
  });

  bench("render medium highlight layer", () => {
    renderMarkdownHighlightLayer(medium);
  });

  bench("render large highlight layer", () => {
    renderMarkdownHighlightLayer(large);
  });
});
