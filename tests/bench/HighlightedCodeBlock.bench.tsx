import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";

vi.mock("../../src/services/codeHighlighter", () => ({
  isSupportedCodeLanguage: (language: string) => language !== "text",
  highlightCodeToTokens: vi.fn(async (code: string) => ({
    tokens: code.split("\n").map((line) => [
      {
        content: line,
        color: "#24292f",
        fontStyle: 0,
      },
    ]),
  })),
}));

import { HighlightedCodeBlock } from "../../src/components/HighlightedCodeBlock";

function makeCode(lines: number) {
  return Array.from(
    { length: lines },
    (_, index) => `const value${index} = ${index};`,
  ).join("\n");
}

const smallCode = makeCode(10);
const mediumCode = makeCode(250);
const largeCode = makeCode(1000);

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderCodeBlock(code: string, language: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <HighlightedCodeBlock
        code={code}
        language={language}
        theme="light"
        sourceLine={1}
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

describe("HighlightedCodeBlock unsupported language render", () => {
  bench("render small unsupported code block", () => {
    renderCodeBlock(smallCode, "not-supported");
  });

  bench("render medium unsupported code block", () => {
    renderCodeBlock(mediumCode, "not-supported");
  });

  bench("render large unsupported code block", () => {
    renderCodeBlock(largeCode, "not-supported");
  });
});

describe("HighlightedCodeBlock supported language initial render", () => {
  bench("render small supported code block fallback", () => {
    renderCodeBlock(smallCode, "typescript");
  });

  bench("render medium supported code block fallback", () => {
    renderCodeBlock(mediumCode, "typescript");
  });

  bench("render large supported code block fallback", () => {
    renderCodeBlock(largeCode, "typescript");
  });
});
