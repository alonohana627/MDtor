import { describe, expect, it } from "vitest";
import {
  buildProjectTree,
  flattenProjectTree,
  getFolderAncestors,
} from "../../../src/components/ProjectSidebar/projectTree";

describe("projectTree", () => {
  it("builds a nested tree and sorts folders before files naturally", () => {
    const tree = buildProjectTree([
      { relativePath: "zeta.md" },
      { relativePath: "docs/file-10.md" },
      { relativePath: "docs/file-2.md" },
      { relativePath: "alpha.md" },
      { relativePath: "Docs/nested/readme.markdown" },
    ]);

    expect(tree.map((node) => node.relativePath)).toEqual([
      "docs",
      "Docs",
      "alpha.md",
      "zeta.md",
    ]);
    expect(tree[0].kind).toBe("folder");

    const docs = tree[0];
    expect(docs.kind).toBe("folder");
    if (docs.kind === "folder") {
      expect(docs.children.map((node) => node.relativePath)).toEqual([
        "docs/file-2.md",
        "docs/file-10.md",
      ]);
    }
  });

  it("flattens only expanded folders", () => {
    const tree = buildProjectTree([
      { relativePath: "docs/intro.md" },
      { relativePath: "docs/reference/api.md" },
    ]);

    expect(flattenProjectTree(tree, new Set()).map((node) => node.relativePath)).toEqual([
      "docs",
    ]);
    expect(
      flattenProjectTree(tree, new Set(["docs"])).map((node) => node.relativePath),
    ).toEqual(["docs", "docs/reference", "docs/intro.md"]);
  });

  it("returns folder ancestors for active file expansion", () => {
    expect(getFolderAncestors("docs/reference/api.md")).toEqual([
      "docs",
      "docs/reference",
    ]);
  });
});
