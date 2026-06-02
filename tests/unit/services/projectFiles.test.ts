import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  createProjectFile,
  deleteProjectFile,
  deleteProjectFolder,
  readProjectFile,
  renameProjectFolder,
  saveProjectFile,
  scanProjectFolder,
} from "../../../src/services/projectFiles";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe("projectFiles", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("scans project folders through the Tauri command boundary", async () => {
    invokeMock.mockResolvedValueOnce([{ relativePath: "chapter.md" }]);

    await expect(scanProjectFolder("/notes/book")).resolves.toEqual([
      { relativePath: "chapter.md" },
    ]);

    expect(invokeMock).toHaveBeenCalledWith("scan_project_folder", {
      projectPath: "/notes/book",
    });
  });

  it("reads project files through the Tauri command boundary", async () => {
    invokeMock.mockResolvedValueOnce("# Chapter");

    await expect(readProjectFile("/notes/book", "chapter.md")).resolves.toBe("# Chapter");

    expect(invokeMock).toHaveBeenCalledWith("read_project_file", {
      projectPath: "/notes/book",
      relativePath: "chapter.md",
    });
  });

  it("saves project files through the Tauri command boundary", async () => {
    invokeMock.mockResolvedValueOnce(undefined);

    await saveProjectFile("/notes/book", "chapter.md", "# Chapter");

    expect(invokeMock).toHaveBeenCalledWith("save_project_file", {
      projectPath: "/notes/book",
      relativePath: "chapter.md",
      content: "# Chapter",
    });
  });

  it("creates and deletes project files through the Tauri command boundary", async () => {
    invokeMock.mockResolvedValue(undefined);

    await createProjectFile("/notes/book", "new.md");
    await deleteProjectFile("/notes/book", "old.md");

    expect(invokeMock).toHaveBeenCalledWith("create_project_file", {
      projectPath: "/notes/book",
      relativePath: "new.md",
    });
    expect(invokeMock).toHaveBeenCalledWith("delete_project_file", {
      projectPath: "/notes/book",
      relativePath: "old.md",
    });
  });

  it("deletes and renames project folders through the Tauri command boundary", async () => {
    invokeMock.mockResolvedValue(undefined);

    await deleteProjectFolder("/notes/book", "drafts");
    await renameProjectFolder("/notes/book", "drafts", "chapters");

    expect(invokeMock).toHaveBeenCalledWith("delete_project_folder", {
      projectPath: "/notes/book",
      relativePath: "drafts",
    });
    expect(invokeMock).toHaveBeenCalledWith("rename_project_folder", {
      projectPath: "/notes/book",
      oldRelativePath: "drafts",
      newRelativePath: "chapters",
    });
  });
});
