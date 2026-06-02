import { describe, expect, it } from "vitest";
import {
  getFolderFiles,
  movePathToRenamedFolder,
  normalizeFolderPath,
} from "../../../src/hooks/workspaceActions/pathUtils";

describe("workspace action path helpers", () => {
  it("normalizes safe folder paths", () => {
    expect(normalizeFolderPath(" notes\\drafts/ ")).toBe("notes/drafts");
    expect(normalizeFolderPath("/notes/drafts/")).toBe("notes/drafts");
  });

  it("rejects empty or escaping folder paths", () => {
    expect(normalizeFolderPath("")).toBeNull();
    expect(normalizeFolderPath("notes//drafts")).toBeNull();
    expect(normalizeFolderPath("notes/../drafts")).toBeNull();
    expect(normalizeFolderPath("./notes")).toBeNull();
  });

  it("finds files below a folder and maps renamed folder paths", () => {
    const files = [
      { relativePath: "notes/one.md" },
      { relativePath: "notes/deep/two.md" },
      { relativePath: "other.md" },
    ];

    expect(getFolderFiles(files, "notes")).toEqual([
      { relativePath: "notes/one.md" },
      { relativePath: "notes/deep/two.md" },
    ]);
    expect(movePathToRenamedFolder("notes/deep/two.md", "notes", "drafts")).toBe(
      "drafts/deep/two.md",
    );
  });
});
