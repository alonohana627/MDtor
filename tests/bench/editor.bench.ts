import { bench, describe } from "vitest";
import { makeMarkdownDocument } from "./fixtures";
import { getCurrentLine } from "../../src/components/MarkdownEditor/MarkdownEditor";

const large = makeMarkdownDocument(2000);

describe("MarkdownEditor helpers", () => {
  bench("get current line near start", () => {
    getCurrentLine(large, 100);
  });

  bench("get current line near middle", () => {
    getCurrentLine(large, Math.floor(large.length / 2));
  });

  bench("get current line near end", () => {
    getCurrentLine(large, large.length);
  });
});
