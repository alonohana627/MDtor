import { beforeEach, describe, expect, it, vi } from "vitest";
import { open } from "@tauri-apps/plugin-dialog";
import {
  clearLastActiveProjectFile,
  clearLastTauriProjectPath,
  loadLastActiveProjectFile,
  loadLastBrowserDirectoryHandle,
  loadLastTauriProjectPath,
  removeRecentProject,
  saveLastActiveProjectFile,
  saveLastBrowserDirectoryHandle,
  saveLastTauriProjectPath,
  saveRecentProject,
} from "../../../src/services/projectPersistence";
import {
  createBrowserProjectFile,
  deleteBrowserProjectFile,
  openBrowserProjectFolder,
  readBrowserProjectFile,
  renameBrowserProjectFile,
  saveBrowserProjectFile,
  scanBrowserProjectFolder,
} from "../../../src/services/browserProjectFiles";
import {
  createProjectFile,
  deleteProjectFile,
  readProjectFile,
  renameProjectFile,
  saveProjectFile,
  scanProjectFolder,
} from "../../../src/services/projectFiles";
import {
  createWorkspaceFile,
  deleteWorkspaceFile,
  findQuickSwitchFile,
  getInitialProjectFile,
  getNextProjectFilePath,
  handleRestoreWorkspaceError,
  loadProjectState,
  openWorkspaceFolder,
  openRecentWorkspaceProject,
  readWorkspaceDocument,
  rememberActiveProjectFile,
  renameWorkspaceFile,
  removeProjectFile,
  reorderProjectFiles,
  restoreWorkspaceProject,
  saveWorkspaceDocument,
  switchWorkspaceFile,
  toProjectErrorMessage,
} from "../../../src/hooks/useProjectWorkspaceHelpers";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("../../../src/services/browserProjectFiles", () => ({
  createBrowserProjectFile: vi.fn(),
  deleteBrowserProjectFile: vi.fn(),
  openBrowserProjectFolder: vi.fn(),
  readBrowserProjectFile: vi.fn(),
  renameBrowserProjectFile: vi.fn(),
  saveBrowserProjectFile: vi.fn(),
  saveLastBrowserDirectoryHandle: vi.fn(),
  scanBrowserProjectFolder: vi.fn(),
}));

vi.mock("../../../src/services/projectFiles", () => ({
  createProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  readProjectFile: vi.fn(),
  renameProjectFile: vi.fn(),
  saveProjectFile: vi.fn(),
  scanProjectFolder: vi.fn(),
}));

vi.mock("../../../src/services/projectPersistence", () => ({
  clearLastActiveProjectFile: vi.fn(),
  clearLastTauriProjectPath: vi.fn(),
  loadLastActiveProjectFile: vi.fn(),
  loadLastBrowserDirectoryHandle: vi.fn(),
  loadLastTauriProjectPath: vi.fn(),
  removeRecentProject: vi.fn(),
  saveLastActiveProjectFile: vi.fn(),
  saveLastBrowserDirectoryHandle: vi.fn(),
  saveLastTauriProjectPath: vi.fn(),
  saveRecentProject: vi.fn(),
}));

const clearLastActiveProjectFileMock = vi.mocked(clearLastActiveProjectFile);
const clearLastTauriProjectPathMock = vi.mocked(clearLastTauriProjectPath);
const createBrowserProjectFileMock = vi.mocked(createBrowserProjectFile);
const createProjectFileMock = vi.mocked(createProjectFile);
const deleteBrowserProjectFileMock = vi.mocked(deleteBrowserProjectFile);
const deleteProjectFileMock = vi.mocked(deleteProjectFile);
const loadLastActiveProjectFileMock = vi.mocked(loadLastActiveProjectFile);
const loadLastBrowserDirectoryHandleMock = vi.mocked(loadLastBrowserDirectoryHandle);
const loadLastTauriProjectPathMock = vi.mocked(loadLastTauriProjectPath);
const openBrowserProjectFolderMock = vi.mocked(openBrowserProjectFolder);
const openMock = vi.mocked(open);
const readBrowserProjectFileMock = vi.mocked(readBrowserProjectFile);
const readProjectFileMock = vi.mocked(readProjectFile);
const removeRecentProjectMock = vi.mocked(removeRecentProject);
const renameBrowserProjectFileMock = vi.mocked(renameBrowserProjectFile);
const renameProjectFileMock = vi.mocked(renameProjectFile);
const saveBrowserProjectFileMock = vi.mocked(saveBrowserProjectFile);
const saveLastBrowserDirectoryHandleMock = vi.mocked(saveLastBrowserDirectoryHandle);
const saveLastActiveProjectFileMock = vi.mocked(saveLastActiveProjectFile);
const saveLastTauriProjectPathMock = vi.mocked(saveLastTauriProjectPath);
const saveProjectFileMock = vi.mocked(saveProjectFile);
const saveRecentProjectMock = vi.mocked(saveRecentProject);
const scanBrowserProjectFolderMock = vi.mocked(scanBrowserProjectFolder);
const scanProjectFolderMock = vi.mocked(scanProjectFolder);

function createWorkspaceHarness() {
  const focusEditor = vi.fn();
  const saveActiveDocument = vi.fn();
  const state = {
    setActiveFile: vi.fn(),
    setCurrentLine: vi.fn(),
    setMarkdown: vi.fn(),
    setProjectFiles: vi.fn(),
    setProjectSource: vi.fn(),
    setSavedMarkdown: vi.fn(),
  };
  const refs = {
    activeFilePath: "chapter-01.md" as string | null,
    browserDirectoryHandle: null as FileSystemDirectoryHandle | null,
    browserFileHandles: new Map<string, never>(),
    projectFiles: [{ relativePath: "chapter-01.md" }, { relativePath: "chapter-02.md" }],
    source: { kind: "tauri" as const, path: "/notes/book" },
  };

  return { focusEditor, refs, saveActiveDocument, state };
}

describe("useProjectWorkspaceHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats Error and non-Error values consistently", () => {
    expect(toProjectErrorMessage(new Error("boom"))).toBe("boom");
    expect(toProjectErrorMessage("boom")).toBe("boom");
  });

  it("persists or clears the active project file based on the selected path", () => {
    rememberActiveProjectFile({ kind: "tauri", path: "/notes/book" }, "chapter.md");
    rememberActiveProjectFile({ kind: "browser", name: "Book", id: "book-1" }, null);

    expect(saveLastActiveProjectFileMock).toHaveBeenCalledWith(
      "tauri:/notes/book",
      "chapter.md",
    );
    expect(clearLastActiveProjectFileMock).toHaveBeenCalledWith("browser:book-1");
  });

  it("prefers the persisted file and falls back to the first available file", () => {
    const files = [{ relativePath: "one.md" }, { relativePath: "two.md" }];
    loadLastActiveProjectFileMock.mockReturnValueOnce("two.md");
    loadLastActiveProjectFileMock.mockReturnValueOnce("missing.md");

    expect(getInitialProjectFile({ kind: "tauri", path: "/notes/book" }, files)).toEqual({
      relativePath: "two.md",
    });
    expect(getInitialProjectFile({ kind: "tauri", path: "/notes/book" }, files)).toEqual({
      relativePath: "one.md",
    });
  });

  it("reads workspace documents from Tauri and browser sources", async () => {
    readProjectFileMock.mockResolvedValueOnce("tauri content");
    readBrowserProjectFileMock.mockResolvedValueOnce("browser content");
    const browserHandles = new Map();

    await expect(
      readWorkspaceDocument(
        { kind: "tauri", path: "/notes/book" },
        browserHandles,
        "chapter.md",
      ),
    ).resolves.toBe("tauri content");

    await expect(
      readWorkspaceDocument(
        { kind: "browser", name: "Book", id: "book-1" },
        browserHandles,
        "chapter.md",
      ),
    ).resolves.toBe("browser content");
  });

  it("saves workspace documents for Tauri and browser sources", async () => {
    const browserHandles = new Map();

    await expect(
      saveWorkspaceDocument({
        source: { kind: "tauri", path: "/notes/book" },
        browserFileHandles: browserHandles,
        activeFilePath: "chapter.md",
        content: "# Saved",
      }),
    ).resolves.toBe(true);

    await expect(
      saveWorkspaceDocument({
        source: { kind: "browser", name: "Book", id: "book-1" },
        browserFileHandles: browserHandles,
        activeFilePath: "chapter.md",
        content: "# Saved",
      }),
    ).resolves.toBe(true);

    expect(saveProjectFileMock).toHaveBeenCalledWith(
      "/notes/book",
      "chapter.md",
      "# Saved",
    );
    expect(saveBrowserProjectFileMock).toHaveBeenCalledWith(
      browserHandles,
      "chapter.md",
      "# Saved",
    );
  });

  it("skips saving when a source or active file is missing", async () => {
    const browserHandles = new Map();

    await expect(
      saveWorkspaceDocument({
        source: null,
        browserFileHandles: browserHandles,
        activeFilePath: "chapter.md",
        content: "# Saved",
      }),
    ).resolves.toBe(false);
    await expect(
      saveWorkspaceDocument({
        source: { kind: "tauri", path: "/notes/book" },
        browserFileHandles: browserHandles,
        activeFilePath: null,
        content: "# Saved",
      }),
    ).resolves.toBe(false);

    expect(saveProjectFileMock).not.toHaveBeenCalled();
    expect(saveBrowserProjectFileMock).not.toHaveBeenCalled();
  });

  it("reorders files, resolves quick-switch matches, and cycles to the next file", () => {
    const files = [
      { relativePath: "one.md" },
      { relativePath: "notes/two.md" },
      { relativePath: "three.md" },
    ];

    expect(reorderProjectFiles(files, "notes/two.md", "up")).toEqual([
      { relativePath: "notes/two.md" },
      { relativePath: "one.md" },
      { relativePath: "three.md" },
    ]);
    expect(reorderProjectFiles(files, "missing.md", "down")).toBe(files);
    expect(findQuickSwitchFile(files, " notes/two.md ")).toEqual({
      relativePath: "notes/two.md",
    });
    expect(findQuickSwitchFile(files, "three")).toEqual({
      relativePath: "three.md",
    });
    expect(findQuickSwitchFile(files, "   ")).toBeNull();
    expect(getNextProjectFilePath(files, "notes/two.md")).toBe("three.md");
    expect(getNextProjectFilePath(files, "missing.md")).toBe("one.md");
    expect(getNextProjectFilePath([{ relativePath: "only.md" }], "only.md")).toBeNull();
  });

  it("removes a file and returns the nearest fallback file", () => {
    const files = [
      { relativePath: "one.md" },
      { relativePath: "two.md" },
      { relativePath: "three.md" },
    ];

    expect(removeProjectFile(files, "two.md")).toEqual({
      fallbackFile: { relativePath: "three.md" },
      nextFiles: [{ relativePath: "one.md" }, { relativePath: "three.md" }],
    });

    expect(removeProjectFile([{ relativePath: "only.md" }], "only.md")).toEqual({
      fallbackFile: null,
      nextFiles: [],
    });
  });

  it("loads project state and can skip applying it", async () => {
    readProjectFileMock.mockResolvedValueOnce("# Chapter");
    const state = {
      setActiveFile: vi.fn(),
      setCurrentLine: vi.fn(),
      setMarkdown: vi.fn(),
      setProjectFiles: vi.fn(),
      setProjectSource: vi.fn(),
      setSavedMarkdown: vi.fn(),
    };

    await loadProjectState({
      source: { kind: "tauri", path: "/notes/book" },
      files: [{ relativePath: "chapter.md" }],
      refs: { browserFileHandles: new Map() },
      state,
      focusEditor: vi.fn(),
      shouldApply: () => false,
    });

    expect(state.setProjectSource).not.toHaveBeenCalled();

    await loadProjectState({
      source: { kind: "tauri", path: "/notes/book" },
      files: [{ relativePath: "chapter.md" }],
      refs: { browserFileHandles: new Map() },
      state,
      focusEditor: vi.fn(),
    });

    expect(state.setProjectSource).toHaveBeenCalledWith({
      kind: "tauri",
      path: "/notes/book",
    });

    await loadProjectState({
      source: { kind: "tauri", path: "/notes/empty" },
      files: [],
      refs: { browserFileHandles: new Map() },
      state,
      focusEditor: vi.fn(),
    });

    expect(state.setActiveFile).toHaveBeenCalledWith(null);
    expect(state.setMarkdown).toHaveBeenCalledWith("");
  });

  it("opens workspace folders across Tauri and browser flows", async () => {
    const saveActiveDocument = vi.fn();
    const state = {
      setActiveFile: vi.fn(),
      setCurrentLine: vi.fn(),
      setMarkdown: vi.fn(),
      setProjectFiles: vi.fn(),
      setProjectSource: vi.fn(),
      setSavedMarkdown: vi.fn(),
    };
    const effects = {
      focusEditor: vi.fn(),
      setBrowserDirectoryHandle: vi.fn(),
      setBrowserFileHandles: vi.fn(),
      setProjectError: vi.fn(),
    };

    loadLastActiveProjectFileMock.mockReturnValue(null);
    readProjectFileMock.mockResolvedValue("# Chapter");
    scanProjectFolderMock.mockResolvedValue([{ relativePath: "chapter.md" }]);
    openMock.mockResolvedValueOnce("/notes/book");

    await openWorkspaceFolder({
      isTauriRuntime: true,
      isBrowserFolderPickerSupported: false,
      saveActiveDocument,
      refs: {
        activeFilePath: "chapter.md",
        browserDirectoryHandle: null,
        browserFileHandles: new Map(),
        projectFiles: [],
        source: { kind: "tauri", path: "/notes/book" },
      },
      state,
      effects,
    });

    expect(saveActiveDocument).toHaveBeenCalled();
    expect(effects.setBrowserDirectoryHandle).toHaveBeenCalledWith(null);
    expect(saveLastTauriProjectPathMock).toHaveBeenCalledWith("/notes/book");

    openMock.mockResolvedValueOnce(null);
    await openWorkspaceFolder({
      isTauriRuntime: true,
      isBrowserFolderPickerSupported: false,
      saveActiveDocument,
      refs: {
        activeFilePath: "chapter.md",
        browserDirectoryHandle: null,
        browserFileHandles: new Map(),
        projectFiles: [],
        source: { kind: "tauri", path: "/notes/book" },
      },
      state,
      effects,
    });

    openBrowserProjectFolderMock.mockResolvedValueOnce(null);
    await openWorkspaceFolder({
      isTauriRuntime: false,
      isBrowserFolderPickerSupported: true,
      saveActiveDocument,
      refs: {
        activeFilePath: null,
        browserDirectoryHandle: null,
        browserFileHandles: new Map(),
        projectFiles: [],
        source: null,
      },
      state,
      effects,
    });

    expect(openBrowserProjectFolderMock).toHaveBeenCalled();

    const directoryHandle = { name: "Browser Book" } as FileSystemDirectoryHandle;
    openBrowserProjectFolderMock.mockResolvedValueOnce({
      directoryHandle,
      id: "browser-book-1",
      fileHandles: new Map([["browser.md", {} as never]]),
      files: [{ relativePath: "browser.md" }],
      name: "Browser Book",
    });
    saveLastBrowserDirectoryHandleMock.mockRejectedValueOnce(new Error("persist failed"));
    readBrowserProjectFileMock.mockResolvedValueOnce("# Browser");

    await openWorkspaceFolder({
      isTauriRuntime: false,
      isBrowserFolderPickerSupported: true,
      saveActiveDocument,
      refs: {
        activeFilePath: null,
        browserDirectoryHandle: null,
        browserFileHandles: new Map(),
        projectFiles: [],
        source: null,
      },
      state,
      effects,
    });

    expect(effects.setBrowserDirectoryHandle).toHaveBeenCalledWith(directoryHandle);
    expect(saveLastBrowserDirectoryHandleMock).toHaveBeenCalledWith(
      directoryHandle,
      "browser-book-1",
    );

    await openWorkspaceFolder({
      isTauriRuntime: false,
      isBrowserFolderPickerSupported: false,
      saveActiveDocument,
      refs: {
        activeFilePath: null,
        browserDirectoryHandle: null,
        browserFileHandles: new Map(),
        projectFiles: [],
        source: null,
      },
      state,
      effects,
    });

    expect(effects.setProjectError).toHaveBeenCalled();
  });

  it("switches files and saves dirty content first", async () => {
    const { focusEditor, refs, saveActiveDocument, state } = createWorkspaceHarness();
    await expect(
      switchWorkspaceFile({
        relativePath: "chapter-01.md",
        isDirty: false,
        refs,
        state,
        focusEditor,
        saveActiveDocument,
      }),
    ).resolves.toBe(false);

    readProjectFileMock.mockResolvedValueOnce("# Chapter 2");
    await expect(
      switchWorkspaceFile({
        relativePath: "chapter-02.md",
        isDirty: true,
        refs,
        state,
        focusEditor,
        saveActiveDocument,
      }),
    ).resolves.toBe(true);
    expect(saveActiveDocument).toHaveBeenCalled();
  });

  it("creates Tauri and browser workspace files", async () => {
    const { focusEditor, refs, saveActiveDocument, state } = createWorkspaceHarness();
    await expect(
      createWorkspaceFile({
        source: { kind: "browser", name: "Book", id: "book-1" },
        relativePath: "new.md",
        isDirty: false,
        refs: { ...refs, source: { kind: "browser", name: "Book", id: "book-1" } },
        state,
        focusEditor,
        saveActiveDocument,
      }),
    ).rejects.toThrow("Open a browser project folder before creating files.");

    createProjectFileMock.mockResolvedValue(undefined);
    await createWorkspaceFile({
      source: { kind: "tauri", path: "/notes/book" },
      relativePath: "new.md",
      isDirty: false,
      refs,
      state,
      focusEditor,
      saveActiveDocument,
    });
    expect(createProjectFileMock).toHaveBeenCalled();

    await createWorkspaceFile({
      source: { kind: "browser", name: "Book", id: "book-1" },
      relativePath: "new.md",
      isDirty: true,
      refs: {
        ...refs,
        browserDirectoryHandle: { name: "Browser Book" } as FileSystemDirectoryHandle,
        browserFileHandles: new Map(),
        source: { kind: "browser", name: "Book", id: "book-1" },
      },
      state,
      focusEditor,
      saveActiveDocument,
    });
    expect(createBrowserProjectFileMock).toHaveBeenCalled();
  });

  it("deletes Tauri and browser workspace files", async () => {
    const { focusEditor, refs, state } = createWorkspaceHarness();
    deleteProjectFileMock.mockResolvedValue(undefined);
    await deleteWorkspaceFile({
      relativePath: "chapter-02.md",
      refs,
      source: { kind: "tauri", path: "/notes/book" },
      state,
      focusEditor,
    });

    await expect(
      deleteWorkspaceFile({
        relativePath: "chapter-01.md",
        refs: { ...refs, source: { kind: "browser", name: "Book", id: "book-1" } },
        source: { kind: "browser", name: "Book", id: "book-1" },
        state,
        focusEditor,
      }),
    ).rejects.toThrow("Open a browser project folder before deleting files.");

    const browserDirectoryHandle = { name: "Browser Book" } as FileSystemDirectoryHandle;
    deleteBrowserProjectFileMock.mockResolvedValue(undefined);
    await deleteWorkspaceFile({
      relativePath: "chapter-01.md",
      refs: {
        ...refs,
        browserDirectoryHandle,
        browserFileHandles: new Map([["chapter-02.md", {} as never]]),
        source: { kind: "browser", name: "Book", id: "book-1" },
      },
      source: { kind: "browser", name: "Book", id: "book-1" },
      state,
      focusEditor,
    });
    expect(deleteBrowserProjectFileMock).toHaveBeenCalled();
  });

  it("renames workspace files and keeps the active file selected", async () => {
    const { refs, state } = createWorkspaceHarness();

    await expect(
      renameWorkspaceFile({
        oldRelativePath: "chapter-01.md",
        newRelativePath: "chapter-01.md",
        refs,
        source: { kind: "tauri", path: "/notes/book" },
        state,
      }),
    ).resolves.toBe(refs.projectFiles);

    await expect(
      renameWorkspaceFile({
        oldRelativePath: "chapter-01.md",
        newRelativePath: "chapter-02.md",
        refs,
        source: { kind: "tauri", path: "/notes/book" },
        state,
      }),
    ).rejects.toThrow("A file already exists at that path.");

    await renameWorkspaceFile({
      oldRelativePath: "chapter-01.md",
      newRelativePath: "renamed.md",
      refs,
      source: { kind: "tauri", path: "/notes/book" },
      state,
    });

    expect(renameProjectFileMock).toHaveBeenCalledWith(
      "/notes/book",
      "chapter-01.md",
      "renamed.md",
    );
    expect(state.setActiveFile).toHaveBeenCalledWith("renamed.md");

    await expect(
      renameWorkspaceFile({
        oldRelativePath: "chapter-02.md",
        newRelativePath: "browser.md",
        refs: {
          ...refs,
          activeFilePath: "chapter-01.md",
          source: { kind: "browser", name: "Book", id: "book-1" },
        },
        source: { kind: "browser", name: "Book", id: "book-1" },
        state,
      }),
    ).rejects.toThrow("Open a browser project folder before renaming files.");

    const browserDirectoryHandle = { name: "Browser Book" } as FileSystemDirectoryHandle;
    await renameWorkspaceFile({
      oldRelativePath: "chapter-02.md",
      newRelativePath: "browser.md",
      refs: {
        ...refs,
        activeFilePath: "chapter-01.md",
        browserDirectoryHandle,
        browserFileHandles: new Map(),
        source: { kind: "browser", name: "Book", id: "book-1" },
      },
      source: { kind: "browser", name: "Book", id: "book-1" },
      state,
    });

    expect(renameBrowserProjectFileMock).toHaveBeenCalledWith(
      browserDirectoryHandle,
      expect.any(Map),
      "chapter-02.md",
      "browser.md",
    );
  });

  it("opens recent projects and removes inaccessible recent entries", async () => {
    const { focusEditor, refs, state } = createWorkspaceHarness();
    const effects = {
      focusEditor,
      setBrowserDirectoryHandle: vi.fn(),
      setBrowserFileHandles: vi.fn(),
      setProjectError: vi.fn(),
      setRecentProjects: vi.fn(),
    };
    saveRecentProjectMock.mockReturnValue([
      { kind: "tauri", id: "/book", label: "/book" },
    ]);
    removeRecentProjectMock.mockReturnValue([]);
    scanProjectFolderMock.mockResolvedValueOnce([{ relativePath: "chapter.md" }]);
    readProjectFileMock.mockResolvedValueOnce("# Chapter");

    await openRecentWorkspaceProject({
      recentProject: { kind: "tauri", id: "/book", label: "/book" },
      refs,
      state,
      effects,
    });

    expect(saveLastTauriProjectPathMock).toHaveBeenCalledWith("/book");
    expect(effects.setRecentProjects).toHaveBeenCalledWith([
      { kind: "tauri", id: "/book", label: "/book" },
    ]);

    scanProjectFolderMock.mockRejectedValueOnce(new Error("missing"));

    await expect(
      openRecentWorkspaceProject({
        recentProject: { kind: "tauri", id: "/missing", label: "/missing" },
        refs,
        state,
        effects,
      }),
    ).rejects.toThrow("missing");

    expect(removeRecentProjectMock).toHaveBeenCalledWith("/missing");

    loadLastBrowserDirectoryHandleMock.mockResolvedValueOnce(null);

    await expect(
      openRecentWorkspaceProject({
        recentProject: { kind: "browser", id: "book-1", label: "Book (browser)" },
        refs,
        state,
        effects,
      }),
    ).rejects.toThrow("That browser project is no longer available.");

    const directoryHandle = { name: "Browser Book" } as FileSystemDirectoryHandle;
    loadLastBrowserDirectoryHandleMock.mockResolvedValueOnce({
      id: "book-1",
      directoryHandle,
    });
    scanBrowserProjectFolderMock.mockResolvedValueOnce({
      fileHandles: new Map([["browser.md", {} as never]]),
      files: [{ relativePath: "browser.md" }],
    });
    readBrowserProjectFileMock.mockResolvedValueOnce("# Browser");
    saveRecentProjectMock.mockReturnValueOnce([
      { kind: "browser", id: "book-1", label: "Book (browser)" },
    ]);

    await openRecentWorkspaceProject({
      recentProject: { kind: "browser", id: "book-1", label: "Book (browser)" },
      refs,
      state,
      effects,
    });

    expect(effects.setBrowserDirectoryHandle).toHaveBeenCalledWith(directoryHandle);
    expect(effects.setBrowserFileHandles).toHaveBeenCalledWith(expect.any(Map));
  });

  it("skips restore when no persisted project is available", async () => {
    const { focusEditor, state } = createWorkspaceHarness();
    loadLastTauriProjectPathMock.mockReturnValueOnce(null);
    await expect(
      restoreWorkspaceProject({
        isTauriRuntime: true,
        isBrowserFolderPickerSupported: false,
        isCancelled: () => false,
        refs: { browserFileHandles: new Map() },
        state,
        effects: {
          focusEditor,
          setBrowserDirectoryHandle: vi.fn(),
          setBrowserFileHandles: vi.fn(),
          setProjectError: vi.fn(),
        },
      }),
    ).resolves.toBeUndefined();

    loadLastBrowserDirectoryHandleMock.mockResolvedValueOnce(null);
    await expect(
      restoreWorkspaceProject({
        isTauriRuntime: false,
        isBrowserFolderPickerSupported: true,
        isCancelled: () => false,
        refs: { browserFileHandles: new Map() },
        state,
        effects: {
          focusEditor,
          setBrowserDirectoryHandle: vi.fn(),
          setBrowserFileHandles: vi.fn(),
          setProjectError: vi.fn(),
        },
      }),
    ).resolves.toBeUndefined();

    await expect(
      restoreWorkspaceProject({
        isTauriRuntime: false,
        isBrowserFolderPickerSupported: false,
        isCancelled: () => false,
        refs: { browserFileHandles: new Map() },
        state,
        effects: {
          focusEditor,
          setBrowserDirectoryHandle: vi.fn(),
          setBrowserFileHandles: vi.fn(),
          setProjectError: vi.fn(),
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("reports restore errors and clears stale Tauri paths", () => {
    const { state } = createWorkspaceHarness();
    handleRestoreWorkspaceError(
      new Error("restore failed"),
      true,
      false,
      state.setMarkdown,
    );
    expect(clearLastTauriProjectPathMock).toHaveBeenCalled();

    const setProjectError = vi.fn();
    handleRestoreWorkspaceError(
      new Error("restore failed"),
      false,
      true,
      setProjectError,
    );
    expect(setProjectError).not.toHaveBeenCalled();
  });
});
