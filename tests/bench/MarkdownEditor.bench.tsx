import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { MarkdownEditor } from "../../src/components/MarkdownEditor";
import { makeMarkdownDocument } from "./fixtures";

const small = makeMarkdownDocument(10);
const medium = makeMarkdownDocument(250);
const large = makeMarkdownDocument(400); // It is not higher because it makes vite timeout.

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderMarkdownEditor(value: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <MarkdownEditor
        value={value}
        currentLine={1}
        activeFilePath="/project/docs/file.md"
        isDirty={false}
        direction="ltr"
        isSaveDisabled={false}
        isTypewriterMode={false}
        onChange={vi.fn()}
        onCurrentLineChange={vi.fn()}
        onEditorScroll={vi.fn()}
        onSave={vi.fn()}
        onDirectionChange={vi.fn()}
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

describe("MarkdownEditor render", () => {
  bench("render small editor", () => {
    renderMarkdownEditor(small);
  });

  bench("render medium editor", () => {
    renderMarkdownEditor(medium);
  });

  bench("render large editor", () => {
    renderMarkdownEditor(large);
  });
});
