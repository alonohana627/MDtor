import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { DocumentOutline } from "../../src/components/DocumentOutline";
import type { OutlineItem } from "../../src/markdown/outline";

function makeOutlineItems(count: number): OutlineItem[] {
  return Array.from({ length: count }, (_, index) => {
    const level = (index % 6) + 1;

    return {
      id: `heading-${index}`,
      text: `Heading ${index}`,
      level,
      line: index * 3 + 1,
    };
  });
}

const emptyItems: OutlineItem[] = [];
const smallItems = makeOutlineItems(10);
const mediumItems = makeOutlineItems(250);
const largeItems = makeOutlineItems(1000);

const onSelectLine = vi.fn();

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderDocumentOutline(items: OutlineItem[], currentLine: number) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <DocumentOutline
        items={items}
        currentLine={currentLine}
        onSelectLine={onSelectLine}
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
  onSelectLine.mockClear();
});

describe("DocumentOutline render", () => {
  bench("render empty outline", () => {
    renderDocumentOutline(emptyItems, 1);
  });

  bench("render small outline", () => {
    renderDocumentOutline(smallItems, 15);
  });

  bench("render medium outline", () => {
    renderDocumentOutline(mediumItems, 375);
  });

  bench("render large outline", () => {
    renderDocumentOutline(largeItems, 1500);
  });
});
