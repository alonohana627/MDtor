import { describe, expect, test } from "vitest";
import { parseMarkdown } from "../../src/markdown/parseMarkdown";

function measureMs(fn: () => void) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

test("parses large markdown under budget", () => {
  const doc = Array.from({ length: 3000 }, (_, i) => `## H${i}\n\nText ${i}`).join(
    "\n\n",
  );

  // warmup
  parseMarkdown(doc);

  const ms = measureMs(() => parseMarkdown(doc));

  expect(ms).toBeLessThan(50);
});
