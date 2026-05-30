import { bench, describe } from "vitest";
import { highlightCodeToTokens } from "../../src/services/codeHighlighter";

function makeCode(lines: number) {
  return Array.from(
    { length: lines },
    (_, index) => `const value${index}: number = ${index};`,
  ).join("\n");
}

const smallCode = makeCode(10);
const mediumCode = makeCode(250);
const largeCode = makeCode(1000);

describe("highlightCodeToTokens", () => {
  bench("highlight small TypeScript code", async () => {
    await highlightCodeToTokens(smallCode, "typescript", "github-light");
  });

  bench("highlight medium TypeScript code", async () => {
    await highlightCodeToTokens(mediumCode, "typescript", "github-light");
  });

  bench("highlight large TypeScript code", async () => {
    await highlightCodeToTokens(largeCode, "typescript", "github-light");
  });
});
