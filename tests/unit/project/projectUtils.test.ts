import { describe, expect, it } from "vitest";
import {
  getProjectLabel,
  getProjectPersistenceId,
  normalizeNewFilePath,
  reconcileProjectFiles,
} from "../../../src/project/projectUtils";

describe("projectUtils", () => {
  it("formats project labels for Tauri and browser sources", () => {
    expect(getProjectLabel(null)).toBeNull();
    expect(getProjectLabel({ kind: "tauri", path: "/notes/book" })).toBe("/notes/book");
    expect(getProjectLabel({ kind: "browser", name: "Book", id: "book-1" })).toBe(
      "Book (browser)",
    );
  });

  it("creates stable persistence ids by project source", () => {
    expect(getProjectPersistenceId({ kind: "tauri", path: "/notes/book" })).toBe(
      "tauri:/notes/book",
    );
    expect(getProjectPersistenceId({ kind: "browser", name: "Book", id: "book-1" })).toBe(
      "browser:book-1",
    );
  });

  it("normalizes new file paths to relative Markdown paths", () => {
    expect(normalizeNewFilePath(" chapter-one ")).toBe("chapter-one.md");
    expect(normalizeNewFilePath("/notes\\idea.markdown")).toBe("notes/idea.markdown");
    expect(normalizeNewFilePath("notes/idea.MD")).toBe("notes/idea.MD");
    expect(normalizeNewFilePath("   ")).toBeNull();
  });

  it("preserves manual order, removes missing files, and appends discovered files", () => {
    expect(
      reconcileProjectFiles(
        [
          { relativePath: "chapter-02.md" },
          { relativePath: "chapter-01.md" },
          { relativePath: "removed.md" },
        ],
        [
          { relativePath: "chapter-01.md" },
          { relativePath: "chapter-02.md" },
          { relativePath: "appendix.md" },
        ],
      ),
    ).toEqual([
      { relativePath: "chapter-02.md" },
      { relativePath: "chapter-01.md" },
      { relativePath: "appendix.md" },
    ]);
  });
});
