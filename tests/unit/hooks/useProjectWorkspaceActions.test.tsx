import { act, renderHook } from "@testing-library/react";
import { isTauri } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteBrowserProjectFolder,
  isBrowserProjectFolderPickerSupported,
  renameBrowserProjectFolder,
  scanBrowserProjectFolder,
} from "../../../src/services/browserProjectFiles";
import {
  deleteProjectFolder,
  renameProjectFolder,
  scanProjectFolder,
  type ProjectFile,
} from "../../../src/services/projectFiles";
import { useProjectWorkspaceActions } from "../../../src/hooks/useProjectWorkspaceActions";
import {
  applyActiveFileFallback,
  createWorkspaceFile,
  deleteWorkspaceFile,
  findQuickSwitchFile,
  getNextProjectFilePath,
  openWorkspaceFolder,
  openRecentWorkspaceProject,
  renameWorkspaceFile,
  saveWorkspaceDocument,
  switchWorkspaceFile,
} from "../../../src/hooks/useProjectWorkspaceHelpers";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: vi.fn(),
}));

vi.mock("../../../src/services/browserProjectFiles", () => ({
  deleteBrowserProjectFolder: vi.fn(),
  isBrowserProjectFolderPickerSupported: vi.fn(),
  renameBrowserProjectFolder: vi.fn(),
  scanBrowserProjectFolder: vi.fn(),
}));

vi.mock("../../../src/services/projectFiles", () => ({
  deleteProjectFolder: vi.fn(),
  renameProjectFolder: vi.fn(),
  scanProjectFolder: vi.fn(),
}));

vi.mock("../../../src/hooks/useProjectWorkspaceHelpers", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/hooks/useProjectWorkspaceHelpers")
  >("../../../src/hooks/useProjectWorkspaceHelpers");

  return {
    ...actual,
    applyActiveFileFallback: vi.fn(),
    createWorkspaceFile: vi.fn(),
    deleteWorkspaceFile: vi.fn(),
    findQuickSwitchFile: vi.fn(),
    getNextProjectFilePath: vi.fn(),
    openWorkspaceFolder: vi.fn(),
    openRecentWorkspaceProject: vi.fn(),
    renameWorkspaceFile: vi.fn(),
    saveWorkspaceDocument: vi.fn(),
    switchWorkspaceFile: vi.fn(),
  };
});

const isTauriMock = vi.mocked(isTauri);
const revealItemInDirMock = vi.mocked(revealItemInDir);
const isBrowserProjectFolderPickerSupportedMock = vi.mocked(
  isBrowserProjectFolderPickerSupported,
);
const scanBrowserProjectFolderMock = vi.mocked(scanBrowserProjectFolder);
const deleteBrowserProjectFolderMock = vi.mocked(deleteBrowserProjectFolder);
const renameBrowserProjectFolderMock = vi.mocked(renameBrowserProjectFolder);
const deleteProjectFolderMock = vi.mocked(deleteProjectFolder);
const renameProjectFolderMock = vi.mocked(renameProjectFolder);
const scanProjectFolderMock = vi.mocked(scanProjectFolder);
const applyActiveFileFallbackMock = vi.mocked(applyActiveFileFallback);
const createWorkspaceFileMock = vi.mocked(createWorkspaceFile);
const deleteWorkspaceFileMock = vi.mocked(deleteWorkspaceFile);
const findQuickSwitchFileMock = vi.mocked(findQuickSwitchFile);
const getNextProjectFilePathMock = vi.mocked(getNextProjectFilePath);
const openWorkspaceFolderMock = vi.mocked(openWorkspaceFolder);
const openRecentWorkspaceProjectMock = vi.mocked(openRecentWorkspaceProject);
const renameWorkspaceFileMock = vi.mocked(renameWorkspaceFile);
const saveWorkspaceDocumentMock = vi.mocked(saveWorkspaceDocument);
const switchWorkspaceFileMock = vi.mocked(switchWorkspaceFile);

function createParams(
  overrides: Partial<Parameters<typeof useProjectWorkspaceActions>[0]> = {},
) {
  return {
    markdown: "# Chapter",
    projectSource: { kind: "tauri" as const, path: "/notes/book" },
    isDirty: false,
    activeFilePathRef: { current: "chapter-01.md" as string | null },
    browserDirectoryHandleRef: { current: null as FileSystemDirectoryHandle | null },
    browserFileHandlesRef: { current: new Map() },
    projectFilesRef: {
      current: [{ relativePath: "chapter-01.md" }, { relativePath: "chapter-02.md" }],
    },
    focusEditor: vi.fn(),
    setActiveFile: vi.fn(),
    setCurrentLine: vi.fn(),
    setIsBusy: vi.fn(),
    setMarkdown: vi.fn(),
    setProjectError: vi.fn(),
    setProjectFiles: vi.fn(),
    setProjectSource: vi.fn(),
    setRecentProjects: vi.fn(),
    setSavedMarkdown: vi.fn(),
    ...overrides,
  };
}

describe("useProjectWorkspaceActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTauriMock.mockReturnValue(true);
    isBrowserProjectFolderPickerSupportedMock.mockReturnValue(false);
    saveWorkspaceDocumentMock.mockResolvedValue(true);
    applyActiveFileFallbackMock.mockResolvedValue(undefined);
    switchWorkspaceFileMock.mockResolvedValue(true);
    createWorkspaceFileMock.mockResolvedValue([{ relativePath: "created.md" }]);
    deleteWorkspaceFileMock.mockResolvedValue([{ relativePath: "chapter-02.md" }]);
    deleteBrowserProjectFolderMock.mockResolvedValue(undefined);
    deleteProjectFolderMock.mockResolvedValue(undefined);
    openRecentWorkspaceProjectMock.mockResolvedValue(undefined);
    renameBrowserProjectFolderMock.mockResolvedValue(undefined);
    renameWorkspaceFileMock.mockResolvedValue([{ relativePath: "renamed.md" }]);
    renameProjectFolderMock.mockResolvedValue(undefined);
    revealItemInDirMock.mockResolvedValue(undefined);
    scanProjectFolderMock.mockResolvedValue([{ relativePath: "chapter-02.md" }]);
    getNextProjectFilePathMock.mockReturnValue("chapter-02.md");
  });

  it("saves the active document only when a save actually happened", async () => {
    const params = createParams();
    const { result, rerender } = renderHook(
      ({ nextParams }) => useProjectWorkspaceActions(nextParams),
      { initialProps: { nextParams: params } },
    );

    await act(async () => {
      await result.current.saveActiveDocument();
    });

    expect(saveWorkspaceDocumentMock).toHaveBeenCalled();
    expect(params.setSavedMarkdown).toHaveBeenCalledWith("# Chapter");

    saveWorkspaceDocumentMock.mockResolvedValueOnce(false);
    const nextParams = createParams({ setSavedMarkdown: params.setSavedMarkdown });
    rerender({ nextParams });

    await act(async () => {
      await result.current.saveActiveDocument();
    });

    expect(params.setSavedMarkdown).toHaveBeenCalledTimes(1);
  });

  it("scans browser folders or returns the cached file list when no handle exists", async () => {
    const params = createParams({
      browserDirectoryHandleRef: { current: null },
    });
    const { result, rerender } = renderHook(
      ({ nextParams }) => useProjectWorkspaceActions(nextParams),
      { initialProps: { nextParams: params } },
    );

    await expect(result.current.scanBrowserFolderForChanges()).resolves.toEqual(
      params.projectFilesRef.current,
    );

    const directoryHandle = { name: "Book" } as FileSystemDirectoryHandle;
    const browserHandles = { current: new Map() };
    scanBrowserProjectFolderMock.mockResolvedValueOnce({
      fileHandles: new Map([["browser.md", {} as never]]),
      files: [{ relativePath: "browser.md" }],
    });
    rerender({
      nextParams: createParams({
        browserDirectoryHandleRef: { current: directoryHandle },
        browserFileHandlesRef: browserHandles,
      }),
    });

    await expect(result.current.scanBrowserFolderForChanges()).resolves.toEqual([
      { relativePath: "browser.md" },
    ]);
    expect(scanBrowserProjectFolderMock).toHaveBeenCalledWith(directoryHandle);
    expect(browserHandles.current.has("browser.md")).toBe(true);
  });

  it("refreshes browser projects and falls back when active files disappear", async () => {
    const directoryHandle = { name: "Book" } as FileSystemDirectoryHandle;
    const browserHandles = { current: new Map() };
    scanBrowserProjectFolderMock.mockResolvedValueOnce({
      fileHandles: new Map([["chapter-02.md", {} as never]]),
      files: [{ relativePath: "chapter-02.md" }],
    });
    const params = createParams({
      projectSource: { kind: "browser", id: "browser-book", name: "Book" },
      browserDirectoryHandleRef: { current: directoryHandle },
      browserFileHandlesRef: browserHandles,
    });
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.refreshProject();
    });

    expect(scanBrowserProjectFolderMock).toHaveBeenCalledWith(directoryHandle);
    expect(params.setProjectFiles).toHaveBeenCalledWith([
      { relativePath: "chapter-02.md" },
    ]);
    expect(applyActiveFileFallbackMock).toHaveBeenCalledWith(
      expect.objectContaining({ files: [{ relativePath: "chapter-02.md" }] }),
    );
    expect(browserHandles.current.has("chapter-02.md")).toBe(true);
  });

  it("does not refresh when no project is open", async () => {
    const params = createParams({ projectSource: null });
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.refreshProject();
    });

    expect(scanProjectFolderMock).not.toHaveBeenCalled();
    expect(params.setIsBusy).not.toHaveBeenCalled();
  });

  it("recovers from externally removed active files", async () => {
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.handleMissingActiveFile([{ relativePath: "chapter-02.md" }]);
    });

    expect(applyActiveFileFallbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [{ relativePath: "chapter-02.md" }],
        source: params.projectSource,
      }),
    );

    applyActiveFileFallbackMock.mockRejectedValueOnce(new Error("fallback failed"));

    await act(async () => {
      await result.current.handleMissingActiveFile([]);
    });

    expect(params.setProjectError).toHaveBeenCalledWith("fallback failed");
  });

  it("opens project folders and reports action errors", async () => {
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.openProjectFolder();
    });

    expect(openWorkspaceFolderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isTauriRuntime: true,
        isBrowserFolderPickerSupported: false,
      }),
    );
    expect(params.setIsBusy).toHaveBeenNthCalledWith(1, true);
    expect(params.setIsBusy).toHaveBeenLastCalledWith(false);

    openWorkspaceFolderMock.mockRejectedValueOnce(new Error("open failed"));

    await act(async () => {
      await result.current.openProjectFolder();
    });

    expect(params.setProjectError).toHaveBeenCalledWith("open failed");
  });

  it("opens recent projects and removes inaccessible project errors", async () => {
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));
    const recentProject = { kind: "tauri" as const, id: "/book", label: "/book" };

    await act(async () => {
      await result.current.openRecentProject(recentProject);
    });

    expect(openRecentWorkspaceProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({ recentProject }),
    );

    openRecentWorkspaceProjectMock.mockRejectedValueOnce(new Error("missing"));

    await act(async () => {
      await result.current.openRecentProject(recentProject);
    });

    expect(params.setProjectError).toHaveBeenCalledWith("missing");
  });

  it("returns early when switching files is unnecessary and reports switch errors", async () => {
    const sameFileParams = createParams();
    const sameFileHook = renderHook(() => useProjectWorkspaceActions(sameFileParams));

    await act(async () => {
      await sameFileHook.result.current.switchFile("chapter-01.md");
    });

    expect(switchWorkspaceFileMock).not.toHaveBeenCalled();

    const closedParams = createParams({ projectSource: null });
    const closedHook = renderHook(() => useProjectWorkspaceActions(closedParams));

    await act(async () => {
      await closedHook.result.current.switchFile("chapter-02.md");
    });

    expect(switchWorkspaceFileMock).not.toHaveBeenCalled();

    switchWorkspaceFileMock.mockRejectedValueOnce(new Error("switch failed"));
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.switchFile("chapter-02.md");
    });

    expect(params.setProjectError).toHaveBeenCalledWith("switch failed");
  });

  it("reports manual-save failures", async () => {
    saveWorkspaceDocumentMock.mockRejectedValueOnce(new Error("save failed"));
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(params.setProjectError).toHaveBeenCalledWith("save failed");
    expect(params.setIsBusy).toHaveBeenLastCalledWith(false);
  });

  it("handles create-file guard rails and errors", async () => {
    const noProjectParams = createParams({ projectSource: null });
    const noProjectHook = renderHook(() => useProjectWorkspaceActions(noProjectParams));

    await act(async () => {
      await noProjectHook.result.current.createNewFile();
    });

    expect(noProjectParams.setProjectError).toHaveBeenCalledWith(
      "Open a project folder before creating a Markdown file.",
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce(null);
    const nullPromptParams = createParams();
    const nullPromptHook = renderHook(() => useProjectWorkspaceActions(nullPromptParams));

    await act(async () => {
      await nullPromptHook.result.current.createNewFile();
    });

    expect(createWorkspaceFileMock).not.toHaveBeenCalled();

    vi.spyOn(window, "prompt").mockReturnValueOnce("   ");
    const blankParams = createParams();
    const blankHook = renderHook(() => useProjectWorkspaceActions(blankParams));

    await act(async () => {
      await blankHook.result.current.createNewFile();
    });

    expect(createWorkspaceFileMock).not.toHaveBeenCalled();

    vi.spyOn(window, "prompt").mockReturnValueOnce("draft");
    createWorkspaceFileMock.mockRejectedValueOnce(new Error("create failed"));
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.createNewFile();
    });

    expect(params.setProjectError).toHaveBeenCalledWith("create failed");
  });

  it("creates folders by creating an initial placeholder Markdown file", async () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce("drafts");
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.createNewFolder();
    });

    expect(window.prompt).toHaveBeenCalledWith("New folder path", "new-folder");
    expect(createWorkspaceFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ relativePath: "drafts/untitled.md" }),
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("parent/child");
    const nestedHook = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await nestedHook.result.current.createNewFolder("parent");
    });

    expect(window.prompt).toHaveBeenCalledWith("New folder path", "parent/new-folder");
  });

  it("handles create-folder guard rails", async () => {
    const noProjectParams = createParams({ projectSource: null });
    const noProjectHook = renderHook(() => useProjectWorkspaceActions(noProjectParams));

    await act(async () => {
      await noProjectHook.result.current.createNewFolder();
    });

    expect(noProjectParams.setProjectError).toHaveBeenCalledWith(
      "Open a project folder before creating a folder.",
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("../bad");
    const invalidHook = renderHook(() => useProjectWorkspaceActions(createParams()));

    await act(async () => {
      await invalidHook.result.current.createNewFolder();
    });

    expect(createWorkspaceFileMock).not.toHaveBeenCalled();
  });

  it("reorders files through the state updater", () => {
    const params = createParams({
      setProjectFiles: vi.fn(
        (updater: ProjectFile[] | ((files: ProjectFile[]) => ProjectFile[])) => {
          if (typeof updater === "function") {
            return updater([
              { relativePath: "chapter-01.md" },
              { relativePath: "chapter-02.md" },
            ]);
          }

          return updater;
        },
      ),
    });
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    act(() => {
      result.current.moveProjectFile("chapter-02.md", "up");
    });

    expect(params.setProjectFiles).toHaveBeenCalled();
  });

  it("handles quick switching states", async () => {
    const noProjectParams = createParams({ projectSource: null });
    const noProjectHook = renderHook(() => useProjectWorkspaceActions(noProjectParams));

    act(() => {
      noProjectHook.result.current.openQuickFileSwitcher();
    });

    expect(noProjectParams.setProjectError).toHaveBeenCalledWith(
      "Open a project folder with Markdown files before switching files.",
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("   ");
    const blankParams = createParams();
    const blankHook = renderHook(() => useProjectWorkspaceActions(blankParams));

    act(() => {
      blankHook.result.current.openQuickFileSwitcher();
    });

    expect(findQuickSwitchFileMock).not.toHaveBeenCalled();

    vi.spyOn(window, "prompt").mockReturnValueOnce("missing");
    findQuickSwitchFileMock.mockReturnValueOnce(null);
    const missingParams = createParams();
    const missingHook = renderHook(() => useProjectWorkspaceActions(missingParams));

    act(() => {
      missingHook.result.current.openQuickFileSwitcher();
    });

    expect(missingParams.setProjectError).toHaveBeenCalledWith(
      'No Markdown file matches "missing".',
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("chapter-02");
    findQuickSwitchFileMock.mockReturnValueOnce({ relativePath: "chapter-02.md" });
    const nullActiveParams = createParams({
      activeFilePathRef: { current: null },
    });
    const nullActiveHook = renderHook(() => useProjectWorkspaceActions(nullActiveParams));

    await act(async () => {
      nullActiveHook.result.current.openQuickFileSwitcher();
    });

    expect(window.prompt).toHaveBeenCalledWith(
      "Switch to Markdown file",
      "chapter-01.md",
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("chapter-02");
    findQuickSwitchFileMock.mockReturnValueOnce({ relativePath: "chapter-02.md" });
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      result.current.openQuickFileSwitcher();
    });

    expect(switchWorkspaceFileMock).toHaveBeenCalled();
  });

  it("switches to the next file only when one exists", async () => {
    const noProjectParams = createParams({ projectSource: null });
    const noProjectHook = renderHook(() => useProjectWorkspaceActions(noProjectParams));

    act(() => {
      noProjectHook.result.current.switchToNextFile();
    });

    expect(getNextProjectFilePathMock).not.toHaveBeenCalled();

    getNextProjectFilePathMock.mockReturnValueOnce(null);
    const noNextParams = createParams();
    const noNextHook = renderHook(() => useProjectWorkspaceActions(noNextParams));

    act(() => {
      noNextHook.result.current.switchToNextFile();
    });

    expect(switchWorkspaceFileMock).not.toHaveBeenCalled();

    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      result.current.switchToNextFile();
    });

    expect(switchWorkspaceFileMock).toHaveBeenCalled();
  });

  it("handles delete-file guards and errors", async () => {
    const noProjectParams = createParams({ projectSource: null });
    const noProjectHook = renderHook(() => useProjectWorkspaceActions(noProjectParams));

    await act(async () => {
      await noProjectHook.result.current.deleteFile("chapter-01.md");
    });

    expect(deleteWorkspaceFileMock).not.toHaveBeenCalled();

    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    const cancelParams = createParams();
    const cancelHook = renderHook(() => useProjectWorkspaceActions(cancelParams));

    await act(async () => {
      await cancelHook.result.current.deleteFile("chapter-01.md");
    });

    expect(deleteWorkspaceFileMock).not.toHaveBeenCalled();

    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    deleteWorkspaceFileMock.mockRejectedValueOnce(new Error("delete failed"));
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.deleteFile("chapter-01.md");
    });

    expect(params.setProjectError).toHaveBeenCalledWith("delete failed");
  });

  it("deletes folders through the project service and falls back when active file was inside", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    scanProjectFolderMock.mockResolvedValueOnce([{ relativePath: "chapter-01.md" }]);
    const params = createParams({
      activeFilePathRef: { current: "notes/idea.md" },
      projectFilesRef: {
        current: [
          { relativePath: "chapter-01.md" },
          { relativePath: "notes/idea.md" },
          { relativePath: "notes/todo.md" },
        ],
      },
    });
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.deleteFolder("notes");
    });

    expect(deleteProjectFolderMock).toHaveBeenCalledWith("/notes/book", "notes");
    expect(scanProjectFolderMock).toHaveBeenCalledWith("/notes/book");
    expect(applyActiveFileFallbackMock).toHaveBeenCalledWith(
      expect.objectContaining({ files: [{ relativePath: "chapter-01.md" }] }),
    );
  });

  it("handles delete-folder guard rails and browser deletion", async () => {
    const noProjectParams = createParams({ projectSource: null });
    const noProjectHook = renderHook(() => useProjectWorkspaceActions(noProjectParams));

    await act(async () => {
      await noProjectHook.result.current.deleteFolder("notes");
    });

    expect(deleteProjectFolderMock).not.toHaveBeenCalled();

    const invalidParams = createParams();
    const invalidHook = renderHook(() => useProjectWorkspaceActions(invalidParams));

    await act(async () => {
      await invalidHook.result.current.deleteFolder("../bad");
    });

    expect(invalidParams.setProjectError).toHaveBeenCalledWith(
      "Folder paths must stay inside the project folder.",
    );

    const emptyParams = createParams();
    const emptyHook = renderHook(() => useProjectWorkspaceActions(emptyParams));

    await act(async () => {
      await emptyHook.result.current.deleteFolder("missing");
    });

    expect(emptyParams.setProjectError).toHaveBeenCalledWith(
      "No Markdown files were found in that folder.",
    );

    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    const cancelParams = createParams({
      projectFilesRef: { current: [{ relativePath: "notes/idea.md" }] },
    });
    const cancelHook = renderHook(() => useProjectWorkspaceActions(cancelParams));

    await act(async () => {
      await cancelHook.result.current.deleteFolder("notes");
    });

    expect(deleteProjectFolderMock).not.toHaveBeenCalled();

    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    scanBrowserProjectFolderMock.mockResolvedValueOnce({
      fileHandles: new Map(),
      files: [],
    });
    const browserHandle = { name: "Book" } as FileSystemDirectoryHandle;
    const browserParams = createParams({
      projectSource: { kind: "browser", id: "browser-book", name: "Book" },
      browserDirectoryHandleRef: { current: browserHandle },
      projectFilesRef: { current: [{ relativePath: "notes/idea.md" }] },
    });
    const browserHook = renderHook(() => useProjectWorkspaceActions(browserParams));

    await act(async () => {
      await browserHook.result.current.deleteFolder("notes");
    });

    expect(deleteBrowserProjectFolderMock).toHaveBeenCalledWith(
      browserHandle,
      browserParams.browserFileHandlesRef.current,
      "notes",
    );
  });

  it("renames files through a prompt and reports invalid names", async () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce("../bad.md");
    const invalidParams = createParams();
    const invalidHook = renderHook(() => useProjectWorkspaceActions(invalidParams));

    await act(async () => {
      await invalidHook.result.current.renameFile("chapter-01.md");
    });

    expect(invalidParams.setProjectError).toHaveBeenCalledWith(
      "File names must be safe relative .md or .markdown paths.",
    );

    vi.spyOn(window, "prompt").mockReturnValueOnce("renamed");
    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.renameFile("chapter-01.md");
    });

    expect(renameWorkspaceFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        oldRelativePath: "chapter-01.md",
        newRelativePath: "renamed.md",
      }),
    );

    renameWorkspaceFileMock.mockRejectedValueOnce(new Error("rename failed"));
    vi.spyOn(window, "prompt").mockReturnValueOnce("renamed");

    await act(async () => {
      await result.current.renameFile("chapter-01.md");
    });

    expect(params.setProjectError).toHaveBeenCalledWith("rename failed");
  });

  it("renames folders through the project service and updates the active path", async () => {
    scanProjectFolderMock.mockResolvedValueOnce([
      { relativePath: "chapter-01.md" },
      { relativePath: "chapters/idea.md" },
    ]);
    const params = createParams({
      activeFilePathRef: { current: "notes/idea.md" },
      projectFilesRef: {
        current: [{ relativePath: "chapter-01.md" }, { relativePath: "notes/idea.md" }],
      },
    });
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.renameFolder("notes", "chapters");
    });

    expect(renameProjectFolderMock).toHaveBeenCalledWith(
      "/notes/book",
      "notes",
      "chapters",
    );
    expect(params.setActiveFile).toHaveBeenCalledWith("chapters/idea.md");
  });

  it("handles rename-folder guard rails, browser rename, and fallback", async () => {
    const noProjectHook = renderHook(() =>
      useProjectWorkspaceActions(createParams({ projectSource: null })),
    );

    await act(async () => {
      await noProjectHook.result.current.renameFolder("notes", "chapters");
    });

    expect(renameProjectFolderMock).not.toHaveBeenCalled();

    const invalidOldParams = createParams();
    const invalidOldHook = renderHook(() => useProjectWorkspaceActions(invalidOldParams));

    await act(async () => {
      await invalidOldHook.result.current.renameFolder("../bad", "chapters");
    });

    expect(invalidOldParams.setProjectError).toHaveBeenCalledWith(
      "Folder paths must stay inside the project folder.",
    );

    const invalidNextParams = createParams({
      projectFilesRef: { current: [{ relativePath: "notes/idea.md" }] },
    });
    const invalidNextHook = renderHook(() =>
      useProjectWorkspaceActions(invalidNextParams),
    );

    await act(async () => {
      await invalidNextHook.result.current.renameFolder("notes", "../bad");
    });

    expect(invalidNextParams.setProjectError).toHaveBeenCalledWith(
      "Folder paths must stay inside the project folder.",
    );

    const intoSelfParams = createParams({
      projectFilesRef: { current: [{ relativePath: "notes/idea.md" }] },
    });
    const intoSelfHook = renderHook(() => useProjectWorkspaceActions(intoSelfParams));

    await act(async () => {
      await intoSelfHook.result.current.renameFolder("notes", "notes/archive");
    });

    expect(intoSelfParams.setProjectError).toHaveBeenCalledWith(
      "Folder cannot be renamed into itself.",
    );

    const missingParams = createParams();
    const missingHook = renderHook(() => useProjectWorkspaceActions(missingParams));

    await act(async () => {
      await missingHook.result.current.renameFolder("missing", "chapters");
    });

    expect(missingParams.setProjectError).toHaveBeenCalledWith(
      "No Markdown files were found in that folder.",
    );

    scanBrowserProjectFolderMock.mockResolvedValueOnce({
      fileHandles: new Map(),
      files: [{ relativePath: "chapter-01.md" }],
    });
    const browserHandle = { name: "Book" } as FileSystemDirectoryHandle;
    const browserParams = createParams({
      projectSource: { kind: "browser", id: "browser-book", name: "Book" },
      activeFilePathRef: { current: "notes/idea.md" },
      browserDirectoryHandleRef: { current: browserHandle },
      projectFilesRef: { current: [{ relativePath: "notes/idea.md" }] },
    });
    const browserHook = renderHook(() => useProjectWorkspaceActions(browserParams));

    await act(async () => {
      await browserHook.result.current.renameFolder("notes", "chapters");
    });

    expect(renameBrowserProjectFolderMock).toHaveBeenCalledWith(
      browserHandle,
      browserParams.browserFileHandlesRef.current,
      "notes",
      "chapters",
    );
    expect(applyActiveFileFallbackMock).toHaveBeenCalled();
  });

  it("reveals files only for desktop projects", async () => {
    const browserParams = createParams({
      projectSource: { kind: "browser", id: "browser-book", name: "Book" },
    });
    const browserHook = renderHook(() => useProjectWorkspaceActions(browserParams));

    await act(async () => {
      await browserHook.result.current.revealFile("chapter-01.md");
    });

    expect(browserParams.setProjectError).toHaveBeenCalledWith(
      "Reveal is only available in the desktop app.",
    );

    const params = createParams();
    const { result } = renderHook(() => useProjectWorkspaceActions(params));

    await act(async () => {
      await result.current.revealFile("chapter-01.md");
    });

    expect(revealItemInDirMock).toHaveBeenCalledWith("/notes/book/chapter-01.md");

    revealItemInDirMock.mockRejectedValueOnce(new Error("reveal failed"));

    await act(async () => {
      await result.current.revealFile("chapter-01.md");
    });

    expect(params.setProjectError).toHaveBeenCalledWith("reveal failed");
  });
});
