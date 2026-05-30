import { bench, describe } from "vitest";
import { type OutlineItem, getActiveOutlineItem } from "../../src/markdown/outline";

function makeOutlineItems(count: number): OutlineItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `heading-${index}`,
    text: `Heading ${index}`,
    level: (index % 6) + 1,
    line: index * 3 + 1,
  }));
}

const smallItems = makeOutlineItems(10);
const mediumItems = makeOutlineItems(250);
const largeItems = makeOutlineItems(1000);

describe("getActiveOutlineItem", () => {
  bench("small outline near end", () => {
    getActiveOutlineItem(smallItems, 30);
  });

  bench("medium outline near end", () => {
    getActiveOutlineItem(mediumItems, 750);
  });

  bench("large outline near end", () => {
    getActiveOutlineItem(largeItems, 3000);
  });
});
