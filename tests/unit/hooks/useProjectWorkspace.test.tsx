import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectWorkspace } from "../../../src/hooks/useProjectWorkspace";
import { useProjectKeyboardShortcuts } from "../../../src/hooks/useProjectKeyboardShortcuts";
import {
  isBrowserProjectFolderPickerSupported,
  openBrowserProjectFolder,
  readBrowserProjectAsset,
  readBrowserProjectFile,
  saveBrowserProjectFile,
  scanBrowserProjectFolder,
} from "../../../src/services/browserProjectFiles";
import {
  createProjectFile,
  deleteProjectFile,
  readProjectAsset,
  readProjectFile,
  saveProjectFile,
  scanProjectFolder,
} from "../../../src/services/projectFiles";
import {
  loadLastActiveProjectFile,
  saveLastActiveProjectFile,
  saveLastTauriProjectPath,
} from "../../../src/services/projectPersistence";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("../../../src/hooks/useProjectKeyboardShortcuts", () => ({
  useProjectKeyboardShortcuts: vi.fn(),
}));

vi.mock("../../../src/hooks/useProjectPolling", () => ({
  useProjectPolling: vi.fn(),
}));

vi.mock("../../../src/services/browserProjectFiles", () => ({
  isBrowserProjectFolderPickerSupported: vi.fn(() => false),
  createBrowserProjectFile: vi.fn(),
  deleteBrowserProjectFolder: vi.fn(),
  deleteBrowserProjectFile: vi.fn(),
  openBrowserProjectFolder: vi.fn(),
  readBrowserProjectAsset: vi.fn(),
  readBrowserProjectFile: vi.fn(),
  renameBrowserProjectFolder: vi.fn(),
  saveBrowserProjectFile: vi.fn(),
  scanBrowserProjectFolder: vi.fn(),
}));

vi.mock("../../../src/services/projectFiles", () => ({
  createProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  deleteProjectFolder: vi.fn(),
  readProjectAsset: vi.fn(),
  readProjectFile: vi.fn(),
  renameProjectFolder: vi.fn(),
  saveProjectFile: vi.fn(),
  scanProjectFolder: vi.fn(),
}));

const isTauriMock = vi.mocked(isTauri);
const openMock = vi.mocked(open);
const createProjectFileMock = vi.mocked(createProjectFile);
const deleteProjectFileMock = vi.mocked(deleteProjectFile);
const readProjectFileMock = vi.mocked(readProjectFile);
const saveProjectFileMock = vi.mocked(saveProjectFile);
const scanProjectFolderMock = vi.mocked(scanProjectFolder);
const useProjectKeyboardShortcutsMock = vi.mocked(useProjectKeyboardShortcuts);
const isBrowserProjectFolderPickerSupportedMock = vi.mocked(
  isBrowserProjectFolderPickerSupported,
);
const openBrowserProjectFolderMock = vi.mocked(openBrowserProjectFolder);
const readBrowserProjectAssetMock = vi.mocked(readBrowserProjectAsset);
const readBrowserProjectFileMock = vi.mocked(readBrowserProjectFile);
const saveBrowserProjectFileMock = vi.mocked(saveBrowserProjectFile);
const scanBrowserProjectFolderMock = vi.mocked(scanBrowserProjectFolder);
const readProjectAssetMock = vi.mocked(readProjectAsset);

const projectFiles = [
  { relativePath: "chapter-01.md" },
  { relativePath: "chapter-02.md" },
  { relativePath: "notes/idea.md" },
];

function mockTauriProject(files = projectFiles) {
  scanProjectFolderMock.mockResolvedValue(files);
  readProjectFileMock.mockImplementation(async (_projectPath, relativePath) => {
    return `content:${relativePath}`;
  });
}

function latestShortcuts() {
  return useProjectKeyboardShortcutsMock.mock.calls.at(-1)?.[0];
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function renderRestoredWorkspace() {
  saveLastTauriProjectPath("/notes/book");
  const renderedHook = renderHook(() => useProjectWorkspace());

  await waitFor(() => {
    expect(renderedHook.result.current.activeFilePath).not.toBeNull();
  });

  return renderedHook;
}

describe("useProjectWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    isTauriMock.mockReturnValue(true);
    isBrowserProjectFolderPickerSupportedMock.mockReturnValue(false);
    mockTauriProject();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      }),
    });
  });

  it("restores the last Tauri project and its last active file", async () => {
    saveLastTauriProjectPath("/notes/book");
    saveLastActiveProjectFile("tauri:/notes/book", "chapter-02.md");

    const { result } = renderHook(() => useProjectWorkspace());

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("chapter-02.md");
    });

    expect(scanProjectFolderMock).toHaveBeenCalledWith("/notes/book");
    expect(readProjectFileMock).toHaveBeenCalledWith("/notes/book", "chapter-02.md");
    expect(result.current.markdown).toBe("content:chapter-02.md");
    expect(result.current.projectFiles).toEqual(projectFiles);
    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBe("chapter-02.md");
  });

  it("reports restore failures and clears the persisted Tauri path", async () => {
    saveLastTauriProjectPath("/notes/broken");
    scanProjectFolderMock.mockRejectedValueOnce(new Error("restore failed"));
    const { result } = renderHook(() => useProjectWorkspace());

    await waitFor(() => {
      expect(result.current.projectError).toBe("restore failed");
    });

    expect(window.localStorage.getItem("mdtor:last-tauri-project-path")).toBeNull();
  });

  it("saves dirty content before switching files and remembers the new active file", async () => {
    const { result } = await renderRestoredWorkspace();

    act(() => {
      result.current.setMarkdown("# Dirty");
    });

    await act(async () => {
      await result.current.switchFile("chapter-02.md");
    });

    expect(saveProjectFileMock).toHaveBeenCalledWith(
      "/notes/book",
      "chapter-01.md",
      "# Dirty",
    );
    expect(result.current.activeFilePath).toBe("chapter-02.md");
    expect(result.current.markdown).toBe("content:chapter-02.md");
    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBe("chapter-02.md");
  });

  it("creates a normalized Markdown file, appends it, and opens a blank editor", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("/drafts\\new-file");
    createProjectFileMock.mockResolvedValue(undefined);
    const { result } = await renderRestoredWorkspace();

    await act(async () => {
      await result.current.createNewFile();
    });

    expect(promptSpy).toHaveBeenCalledWith("New Markdown file path", "untitled.md");
    expect(createProjectFileMock).toHaveBeenCalledWith(
      "/notes/book",
      "drafts/new-file.md",
    );
    expect(result.current.activeFilePath).toBe("drafts/new-file.md");
    expect(result.current.projectFiles).toContainEqual({
      relativePath: "drafts/new-file.md",
    });
    expect(result.current.markdown).toBe("");
    expect(result.current.isDirty).toBe(false);
  });

  it("deletes the active file and opens the nearest fallback file", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteProjectFileMock.mockResolvedValue(undefined);
    const { result } = await renderRestoredWorkspace();

    await act(async () => {
      await result.current.deleteFile("chapter-01.md");
    });

    expect(deleteProjectFileMock).toHaveBeenCalledWith("/notes/book", "chapter-01.md");
    expect(result.current.projectFiles).toEqual([
      { relativePath: "chapter-02.md" },
      { relativePath: "notes/idea.md" },
    ]);
    expect(result.current.activeFilePath).toBe("chapter-02.md");
    expect(result.current.markdown).toBe("content:chapter-02.md");
    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBe("chapter-02.md");
  });

  it("reports delete failures", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteProjectFileMock.mockRejectedValueOnce(new Error("delete failed"));
    const { result } = await renderRestoredWorkspace();

    await act(async () => {
      await result.current.deleteFile("chapter-01.md");
    });

    expect(result.current.projectError).toBe("delete failed");
  });

  it("opens a selected Tauri folder and persists it", async () => {
    window.localStorage.clear();
    openMock.mockResolvedValue("/notes/new-book");
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.openProjectFolder();
    });

    expect(openMock).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: "Open writing project",
    });
    expect(scanProjectFolderMock).toHaveBeenCalledWith("/notes/new-book");
    expect(result.current.projectSource).toEqual({
      kind: "tauri",
      path: "/notes/new-book",
    });
    expect(window.localStorage.getItem("mdtor:last-tauri-project-path")).toBe(
      "/notes/new-book",
    );
  });

  it("reports a Firefox/browser-mode folder opening error when direct folder APIs are unavailable", async () => {
    isTauriMock.mockReturnValue(false);
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.openProjectFolder();
    });

    expect(result.current.projectError).toContain("Firefox does not support");
    expect(openMock).not.toHaveBeenCalled();
  });

  it("manual save writes the active Markdown content and clears dirty state", async () => {
    const { result } = await renderRestoredWorkspace();

    act(() => {
      result.current.setMarkdown("# Saved");
    });

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(saveProjectFileMock).toHaveBeenCalledWith(
      "/notes/book",
      "chapter-01.md",
      "# Saved",
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("loads project documents alphabetically and uses unsaved active editor text", async () => {
    mockTauriProject([
      { relativePath: "b.md" },
      { relativePath: "a.md" },
      { relativePath: "chapters/c.md" },
    ]);
    saveLastTauriProjectPath("/notes/book");
    const { result } = renderHook(() => useProjectWorkspace());

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("b.md");
    });

    act(() => {
      result.current.setMarkdown("# Unsaved B");
    });

    await expect(result.current.loadProjectDocuments()).resolves.toEqual([
      { relativePath: "a.md", markdown: "content:a.md" },
      { relativePath: "b.md", markdown: "# Unsaved B" },
      { relativePath: "chapters/c.md", markdown: "content:chapters/c.md" },
    ]);
    expect(readProjectFileMock).toHaveBeenCalledWith("/notes/book", "a.md");
    expect(readProjectFileMock).toHaveBeenCalledWith("/notes/book", "chapters/c.md");
  });

  it("ignores manual saves when no project is open", async () => {
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(saveProjectFileMock).not.toHaveBeenCalled();
    expect(saveBrowserProjectFileMock).not.toHaveBeenCalled();
  });

  it("rejects loading project documents when no project is open", async () => {
    const { result } = renderHook(() => useProjectWorkspace());

    await expect(result.current.loadProjectDocuments()).rejects.toThrow(
      "Open a project folder before exporting project files.",
    );
  });

  it("reorders project files and ignores invalid moves", async () => {
    const { result } = await renderRestoredWorkspace();

    act(() => {
      result.current.moveProjectFile("chapter-02.md", "up");
    });

    expect(result.current.projectFiles.map((file) => file.relativePath)).toEqual([
      "chapter-02.md",
      "chapter-01.md",
      "notes/idea.md",
    ]);

    act(() => {
      result.current.moveProjectFile("chapter-02.md", "up");
      result.current.moveProjectFile("missing.md", "down");
    });

    expect(result.current.projectFiles.map((file) => file.relativePath)).toEqual([
      "chapter-02.md",
      "chapter-01.md",
      "notes/idea.md",
    ]);
  });

  it("quick switcher opens exact and partial file matches", async () => {
    const { result } = await renderRestoredWorkspace();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("idea");

    act(() => {
      latestShortcuts()?.openQuickFileSwitcher();
    });

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("notes/idea.md");
    });

    expect(promptSpy).toHaveBeenCalledWith("Switch to Markdown file", "chapter-01.md");
    expect(result.current.markdown).toBe("content:notes/idea.md");
  });

  it("quick switcher reports no-match errors and ignores blank queries", async () => {
    const { result } = await renderRestoredWorkspace();

    vi.spyOn(window, "prompt").mockReturnValue("missing");

    act(() => {
      latestShortcuts()?.openQuickFileSwitcher();
    });

    expect(result.current.projectError).toBe('No Markdown file matches "missing".');

    vi.spyOn(window, "prompt").mockReturnValue("   ");

    act(() => {
      latestShortcuts()?.openQuickFileSwitcher();
    });

    expect(result.current.projectError).toBe('No Markdown file matches "missing".');
  });

  it("Ctrl+Tab workflow switches to the next Markdown file and wraps", async () => {
    const { result } = await renderRestoredWorkspace();

    act(() => {
      latestShortcuts()?.switchToNextFile();
    });

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("chapter-02.md");
    });

    act(() => {
      latestShortcuts()?.switchToNextFile();
    });

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("notes/idea.md");
    });

    act(() => {
      latestShortcuts()?.switchToNextFile();
    });

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("chapter-01.md");
    });
  });

  it("deleting the only active file clears editor state and active persistence", async () => {
    mockTauriProject([{ relativePath: "only.md" }]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    saveLastTauriProjectPath("/notes/book");
    const { result } = renderHook(() => useProjectWorkspace());

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("only.md");
    });

    await act(async () => {
      await result.current.deleteFile("only.md");
    });

    expect(result.current.activeFilePath).toBeNull();
    expect(result.current.markdown).toBe("");
    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBeNull();
  });

  it("does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = await renderRestoredWorkspace();

    await act(async () => {
      await result.current.deleteFile("chapter-01.md");
    });

    expect(deleteProjectFileMock).not.toHaveBeenCalled();
    expect(result.current.activeFilePath).toBe("chapter-01.md");
  });

  it("opens browser folders, reads files, and saves browser handles", async () => {
    isTauriMock.mockReturnValue(false);
    isBrowserProjectFolderPickerSupportedMock.mockReturnValue(true);
    const directoryHandle = { name: "Browser Book" } as FileSystemDirectoryHandle;
    const browserProject = {
      id: "browser-book-1",
      name: "Browser Book",
      files: [{ relativePath: "browser.md" }],
      fileHandles: new Map(),
      directoryHandle,
    };
    openBrowserProjectFolderMock.mockResolvedValue(browserProject);
    readBrowserProjectFileMock.mockResolvedValue("# Browser");
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.openProjectFolder();
    });

    expect(result.current.projectSource).toEqual({
      kind: "browser",
      name: "Browser Book",
      id: "browser-book-1",
    });
    expect(result.current.activeFilePath).toBe("browser.md");
    expect(result.current.markdown).toBe("# Browser");

    act(() => {
      result.current.setMarkdown("# Browser Dirty");
    });

    await act(async () => {
      await result.current.handleManualSave();
    });

    expect(saveBrowserProjectFileMock).toHaveBeenCalledWith(
      browserProject.fileHandles,
      "browser.md",
      "# Browser Dirty",
    );
  });

  it("keeps the current state when folder opening is cancelled", async () => {
    isTauriMock.mockReturnValue(true);
    openMock.mockResolvedValue(null);
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.openProjectFolder();
    });

    expect(result.current.projectSource).toBeNull();
    expect(result.current.projectFiles).toEqual([]);
  });

  it("restores browser projects when a browser handle is persisted", async () => {
    isTauriMock.mockReturnValue(false);
    isBrowserProjectFolderPickerSupportedMock.mockReturnValue(true);
    const directoryHandle = {
      name: "Browser Book",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    } as unknown as FileSystemDirectoryHandle;
    const browserProject = {
      id: "browser-book-1",
      name: "Browser Book",
      files: [{ relativePath: "browser.md" }],
      fileHandles: new Map([["browser.md", {} as never]]),
      directoryHandle,
    };
    scanBrowserProjectFolderMock.mockResolvedValue({
      files: browserProject.files,
      fileHandles: browserProject.fileHandles,
    });
    readBrowserProjectFileMock.mockResolvedValue("# Browser");
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        const request = {
          error: null,
          result: {
            objectStoreNames: { contains: vi.fn(() => true) },
            close: vi.fn(),
            transaction: vi.fn(() => ({
              error: null,
              oncomplete: null,
              onerror: null,
              objectStore: vi.fn(() => ({
                get: () => {
                  const readRequest = {
                    error: null,
                    result: { id: "browser-book-1", directoryHandle },
                    onerror: null,
                    onsuccess: null,
                  };

                  queueMicrotask(() => {
                    readRequest.onsuccess?.();
                  });

                  return readRequest;
                },
                put: vi.fn(),
              })),
            })),
          },
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
        };

        queueMicrotask(() => {
          request.onsuccess?.();
        });

        return request;
      }),
    });

    const { result } = renderHook(() => useProjectWorkspace());

    await waitFor(() => {
      expect(result.current.projectSource).toEqual({
        kind: "browser",
        name: "Browser Book",
        id: "browser-book-1",
      });
    });
    expect(result.current.activeFilePath).toBe("browser.md");
    expect(result.current.markdown).toBe("# Browser");
  });

  it("loads Tauri project images relative to the active file", async () => {
    readProjectAssetMock.mockResolvedValue({
      bytes: [137, 80, 78, 71],
      mimeType: "image/png",
    });
    const { result } = await renderRestoredWorkspace();

    const blob = await result.current.loadProjectImage("../assets/cover.png");

    expect(readProjectAssetMock).toHaveBeenCalledWith(
      "/notes/book",
      "chapter-01.md",
      "../assets/cover.png",
    );
    expect(blob.type).toBe("image/png");
    await expect(blob.arrayBuffer()).resolves.toEqual(
      new Uint8Array([137, 80, 78, 71]).buffer,
    );
  });

  it("loads browser project images when a directory handle is open", async () => {
    isTauriMock.mockReturnValue(false);
    isBrowserProjectFolderPickerSupportedMock.mockReturnValue(true);
    const directoryHandle = { name: "Browser Book" } as FileSystemDirectoryHandle;
    const image = new File(["image"], "cover.png", { type: "image/png" });
    openBrowserProjectFolderMock.mockResolvedValue({
      id: "browser-book-1",
      name: "Browser Book",
      files: [{ relativePath: "browser.md" }],
      fileHandles: new Map(),
      directoryHandle,
    });
    readBrowserProjectFileMock.mockResolvedValue("# Browser");
    readBrowserProjectAssetMock.mockResolvedValue(image);
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.openProjectFolder();
    });

    await waitFor(() => {
      expect(result.current.activeFilePath).toBe("browser.md");
    });

    await expect(result.current.loadProjectImage("cover.png")).resolves.toBe(image);
    expect(readBrowserProjectAssetMock).toHaveBeenCalledWith(
      directoryHandle,
      "browser.md",
      "cover.png",
    );
  });

  it("rejects image loading when no active project file is open", async () => {
    const { result } = renderHook(() => useProjectWorkspace());

    await expect(result.current.loadProjectImage("cover.png")).rejects.toThrow(
      "Open a project file before previewing local images.",
    );
    expect(readProjectAssetMock).not.toHaveBeenCalled();
    expect(readBrowserProjectAssetMock).not.toHaveBeenCalled();
  });

  it("rejects browser image loading when the directory handle is unavailable", async () => {
    isTauriMock.mockReturnValue(false);
    isBrowserProjectFolderPickerSupportedMock.mockReturnValue(true);
    openBrowserProjectFolderMock.mockResolvedValue({
      id: "browser-book-1",
      name: "Browser Book",
      files: [{ relativePath: "browser.md" }],
      fileHandles: new Map(),
      directoryHandle: null as never,
    });
    readBrowserProjectFileMock.mockResolvedValue("# Browser");
    const { result } = renderHook(() => useProjectWorkspace());

    await act(async () => {
      await result.current.openProjectFolder();
    });

    await waitFor(() => {
      expect(result.current.projectSource).toEqual({
        kind: "browser",
        id: "browser-book-1",
        name: "Browser Book",
      });
    });

    await expect(result.current.loadProjectImage("cover.png")).rejects.toThrow(
      "Open a browser project folder before previewing local images.",
    );
    expect(readBrowserProjectAssetMock).not.toHaveBeenCalled();
  });

  it("skips state updates when restore is cancelled mid-flight", async () => {
    const restoreGate = createDeferred<ProjectFile[]>();
    saveLastTauriProjectPath("/notes/book");
    scanProjectFolderMock.mockReturnValueOnce(restoreGate.promise);
    readProjectFileMock.mockImplementationOnce(async () => {
      await Promise.resolve();
      return "content:chapter-01.md";
    });
    const { unmount, result } = renderHook(() => useProjectWorkspace());

    unmount();
    restoreGate.resolve(projectFiles);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.projectSource).toBeNull();
    expect(result.current.projectFiles).toEqual([]);
    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBeNull();
  });
});
