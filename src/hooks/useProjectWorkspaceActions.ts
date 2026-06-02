import { useCallback } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  deleteBrowserProjectFolder,
  isBrowserProjectFolderPickerSupported,
  renameBrowserProjectFolder,
  scanBrowserProjectFolder,
  type BrowserProjectFile,
} from "../services/browserProjectFiles";
import {
  deleteProjectFolder,
  renameProjectFolder,
  scanProjectFolder,
  type ProjectFile,
} from "../services/projectFiles";
import { type RecentProject } from "../services/projectPersistence";
import { normalizeProjectFilePath, reconcileProjectFiles } from "../project/projectUtils";
import { type ProjectSource } from "../project/projectTypes";
import {
  applyActiveFileFallback,
  createWorkspaceFile,
  deleteWorkspaceFile,
  findQuickSwitchFile,
  getNextProjectFilePath,
  rememberActiveProjectFile,
  openWorkspaceFolder,
  openRecentWorkspaceProject,
  renameWorkspaceFile,
  reorderProjectFiles,
  saveWorkspaceDocument,
  switchWorkspaceFile,
  toProjectErrorMessage,
} from "./useProjectWorkspaceHelpers";

type WorkspaceActionsParams = {
  markdown: string;
  projectSource: ProjectSource | null;
  isDirty: boolean;
  activeFilePathRef: { current: string | null };
  browserDirectoryHandleRef: { current: FileSystemDirectoryHandle | null };
  browserFileHandlesRef: { current: Map<string, BrowserProjectFile> };
  projectFilesRef: { current: ProjectFile[] };
  focusEditor: () => void;
  setActiveFile: (relativePath: string | null) => void;
  setCurrentLine: (line: number) => void;
  setIsBusy: (value: boolean) => void;
  setMarkdown: (value: string) => void;
  setProjectError: (value: string | null) => void;
  setProjectFiles: (
    files: ProjectFile[] | ((files: ProjectFile[]) => ProjectFile[]),
  ) => void;
  setProjectSource: (source: ProjectSource | null) => void;
  setSavedMarkdown: (value: string) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
};

function normalizeFolderPath(input: string) {
  const normalizedPath = input
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (
    !normalizedPath ||
    normalizedPath.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    return null;
  }

  return normalizedPath;
}

function getFolderFiles(files: ProjectFile[], folderPath: string) {
  return files.filter((file) => file.relativePath.startsWith(`${folderPath}/`));
}

function movePathToRenamedFolder(
  relativePath: string,
  oldFolderPath: string,
  newFolderPath: string,
) {
  return `${newFolderPath}${relativePath.slice(oldFolderPath.length)}`;
}

export function useProjectWorkspaceActions({
  markdown,
  projectSource,
  isDirty,
  activeFilePathRef,
  browserDirectoryHandleRef,
  browserFileHandlesRef,
  projectFilesRef,
  focusEditor,
  setActiveFile,
  setCurrentLine,
  setIsBusy,
  setMarkdown,
  setProjectError,
  setProjectFiles,
  setProjectSource,
  setSavedMarkdown,
  setRecentProjects,
}: WorkspaceActionsParams) {
  const saveActiveDocument = useCallback(
    async (content = markdown) => {
      const didSave = await saveWorkspaceDocument({
        source: projectSource,
        browserFileHandles: browserFileHandlesRef.current,
        activeFilePath: activeFilePathRef.current,
        content,
      });

      if (didSave) {
        setSavedMarkdown(content);
      }
    },
    [activeFilePathRef, browserFileHandlesRef, markdown, projectSource, setSavedMarkdown],
  );

  const scanBrowserFolderForChanges = useCallback(async () => {
    if (!browserDirectoryHandleRef.current) {
      return projectFilesRef.current;
    }

    const browserProject = await scanBrowserProjectFolder(
      browserDirectoryHandleRef.current,
    );
    browserFileHandlesRef.current = browserProject.fileHandles;
    return browserProject.files;
  }, [browserDirectoryHandleRef, browserFileHandlesRef, projectFilesRef]);

  const scanCurrentProjectFiles = useCallback(async () => {
    if (!projectSource) {
      return projectFilesRef.current;
    }

    let scannedFiles: ProjectFile[] = [];

    if (projectSource.kind === "tauri") {
      scannedFiles = await scanProjectFolder(projectSource.path);
    } else if (browserDirectoryHandleRef.current) {
      const browserProject = await scanBrowserProjectFolder(
        browserDirectoryHandleRef.current,
      );

      browserFileHandlesRef.current = browserProject.fileHandles;
      scannedFiles = browserProject.files;
    }

    const nextFiles = reconcileProjectFiles(projectFilesRef.current, scannedFiles);

    projectFilesRef.current = nextFiles;
    setProjectFiles(nextFiles);

    return nextFiles;
  }, [
    browserDirectoryHandleRef,
    browserFileHandlesRef,
    projectFilesRef,
    projectSource,
    setProjectFiles,
  ]);

  const handleMissingActiveFile = useCallback(
    async (files: ProjectFile[]) => {
      if (!projectSource || !activeFilePathRef.current) {
        return;
      }

      try {
        await applyActiveFileFallback({
          files,
          refs: {
            browserFileHandles: browserFileHandlesRef.current,
          },
          source: projectSource,
          state: {
            setActiveFile,
            setCurrentLine,
            setMarkdown,
            setSavedMarkdown,
          },
          focusEditor,
        });
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      }
    },
    [
      activeFilePathRef,
      browserFileHandlesRef,
      focusEditor,
      projectSource,
      setActiveFile,
      setCurrentLine,
      setMarkdown,
      setProjectError,
      setSavedMarkdown,
    ],
  );

  const openProjectFolder = useCallback(async () => {
    setIsBusy(true);
    setProjectError(null);

    try {
      await openWorkspaceFolder({
        isTauriRuntime: isTauri(),
        isBrowserFolderPickerSupported: isBrowserProjectFolderPickerSupported(),
        saveActiveDocument,
        refs: {
          activeFilePath: activeFilePathRef.current,
          browserDirectoryHandle: browserDirectoryHandleRef.current,
          browserFileHandles: browserFileHandlesRef.current,
          projectFiles: projectFilesRef.current,
          source: projectSource,
        },
        state: {
          setActiveFile,
          setCurrentLine,
          setMarkdown,
          setProjectFiles: (files) => {
            projectFilesRef.current = files;
            setProjectFiles(files);
          },
          setProjectSource,
          setSavedMarkdown,
        },
        effects: {
          focusEditor,
          setBrowserDirectoryHandle: (handle) => {
            browserDirectoryHandleRef.current = handle;
          },
          setBrowserFileHandles: (handles) => {
            browserFileHandlesRef.current = handles;
          },
          setProjectError,
          setRecentProjects,
        },
      });
    } catch (error) {
      setProjectError(toProjectErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }, [
    activeFilePathRef,
    browserDirectoryHandleRef,
    browserFileHandlesRef,
    focusEditor,
    projectFilesRef,
    projectSource,
    saveActiveDocument,
    setActiveFile,
    setCurrentLine,
    setIsBusy,
    setMarkdown,
    setProjectError,
    setProjectFiles,
    setProjectSource,
    setSavedMarkdown,
    setRecentProjects,
  ]);

  const openRecentProject = useCallback(
    async (recentProject: RecentProject) => {
      setIsBusy(true);
      setProjectError(null);

      try {
        await saveActiveDocument();
        await openRecentWorkspaceProject({
          recentProject,
          refs: {
            activeFilePath: activeFilePathRef.current,
            browserDirectoryHandle: browserDirectoryHandleRef.current,
            browserFileHandles: browserFileHandlesRef.current,
            projectFiles: projectFilesRef.current,
            source: projectSource,
          },
          state: {
            setActiveFile,
            setCurrentLine,
            setMarkdown,
            setProjectFiles: (files) => {
              projectFilesRef.current = files;
              setProjectFiles(files);
            },
            setProjectSource,
            setSavedMarkdown,
          },
          effects: {
            focusEditor,
            setBrowserDirectoryHandle: (handle) => {
              browserDirectoryHandleRef.current = handle;
            },
            setBrowserFileHandles: (handles) => {
              browserFileHandlesRef.current = handles;
            },
            setProjectError,
            setRecentProjects,
          },
        });
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      projectFilesRef,
      projectSource,
      saveActiveDocument,
      setActiveFile,
      setCurrentLine,
      setIsBusy,
      setMarkdown,
      setProjectError,
      setProjectFiles,
      setProjectSource,
      setRecentProjects,
      setSavedMarkdown,
    ],
  );

  const switchFile = useCallback(
    async (relativePath: string) => {
      if (!projectSource || relativePath === activeFilePathRef.current) {
        return;
      }

      setIsBusy(true);
      setProjectError(null);

      try {
        await switchWorkspaceFile({
          relativePath,
          isDirty,
          refs: {
            activeFilePath: activeFilePathRef.current,
            browserDirectoryHandle: browserDirectoryHandleRef.current,
            browserFileHandles: browserFileHandlesRef.current,
            projectFiles: projectFilesRef.current,
            source: projectSource,
          },
          state: {
            setActiveFile,
            setCurrentLine,
            setMarkdown,
            setSavedMarkdown,
          },
          focusEditor,
          saveActiveDocument,
        });
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      isDirty,
      projectFilesRef,
      projectSource,
      saveActiveDocument,
      setActiveFile,
      setCurrentLine,
      setIsBusy,
      setMarkdown,
      setProjectError,
      setSavedMarkdown,
    ],
  );

  const handleManualSave = useCallback(async () => {
    setIsBusy(true);
    setProjectError(null);

    try {
      await saveActiveDocument(markdown);
    } catch (error) {
      setProjectError(toProjectErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }, [markdown, saveActiveDocument, setIsBusy, setProjectError]);

  const createFileAtPath = useCallback(
    async (relativePath: string) => {
      if (!projectSource) {
        setProjectError("Open a project folder before creating a Markdown file.");
        return;
      }

      setIsBusy(true);
      setProjectError(null);

      try {
        projectFilesRef.current = await createWorkspaceFile({
          source: projectSource,
          relativePath,
          isDirty,
          refs: {
            activeFilePath: activeFilePathRef.current,
            browserDirectoryHandle: browserDirectoryHandleRef.current,
            browserFileHandles: browserFileHandlesRef.current,
            projectFiles: projectFilesRef.current,
            source: projectSource,
          },
          state: {
            setActiveFile,
            setCurrentLine,
            setMarkdown,
            setProjectFiles,
            setSavedMarkdown,
          },
          focusEditor,
          saveActiveDocument,
        });
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      isDirty,
      projectFilesRef,
      projectSource,
      saveActiveDocument,
      setActiveFile,
      setCurrentLine,
      setIsBusy,
      setMarkdown,
      setProjectError,
      setProjectFiles,
      setSavedMarkdown,
    ],
  );

  const createNewFile = useCallback(
    async (initialPath = "untitled.md") => {
      if (!projectSource) {
        setProjectError("Open a project folder before creating a Markdown file.");
        return;
      }

      const requestedPath = window.prompt("New Markdown file path", initialPath);
      const relativePath = requestedPath ? normalizeProjectFilePath(requestedPath) : null;

      if (!relativePath) {
        return;
      }

      await createFileAtPath(relativePath);
    },
    [createFileAtPath, projectSource, setProjectError],
  );

  const createNewFolder = useCallback(
    async (parentPath = "") => {
      if (!projectSource) {
        setProjectError("Open a project folder before creating a folder.");
        return;
      }

      const defaultFolderPath = parentPath ? `${parentPath}/new-folder` : "new-folder";
      const requestedPath = window.prompt("New folder path", defaultFolderPath);
      const folderPath = normalizeFolderPath(requestedPath ?? "");

      if (!folderPath) {
        return;
      }

      const placeholderPath = normalizeProjectFilePath(`${folderPath}/untitled.md`);

      if (!placeholderPath) {
        setProjectError("Folder names must stay inside the project.");
        return;
      }

      await createFileAtPath(placeholderPath);
    },
    [createFileAtPath, projectSource, setProjectError],
  );

  const moveProjectFile = useCallback(
    (relativePath: string, direction: "up" | "down") => {
      setProjectFiles((currentFiles) => {
        const nextFiles = reorderProjectFiles(currentFiles, relativePath, direction);
        projectFilesRef.current = nextFiles;
        return nextFiles;
      });
    },
    [projectFilesRef, setProjectFiles],
  );

  const openQuickFileSwitcher = useCallback(() => {
    if (!projectSource || projectFilesRef.current.length === 0) {
      setProjectError(
        "Open a project folder with Markdown files before switching files.",
      );
      return;
    }

    const query = window.prompt(
      "Switch to Markdown file",
      activeFilePathRef.current ?? projectFilesRef.current[0].relativePath,
    );
    const normalizedQuery = query?.trim();

    if (!normalizedQuery) {
      return;
    }

    const nextFile = findQuickSwitchFile(projectFilesRef.current, normalizedQuery);

    if (!nextFile) {
      setProjectError(`No Markdown file matches "${query}".`);
      return;
    }

    void switchFile(nextFile.relativePath);
  }, [activeFilePathRef, projectFilesRef, projectSource, setProjectError, switchFile]);

  const switchToNextFile = useCallback(() => {
    if (!projectSource) {
      return;
    }

    const nextFilePath = getNextProjectFilePath(
      projectFilesRef.current,
      activeFilePathRef.current,
    );

    if (!nextFilePath) {
      return;
    }

    void switchFile(nextFilePath);
  }, [activeFilePathRef, projectFilesRef, projectSource, switchFile]);

  const refreshProject = useCallback(async () => {
    if (!projectSource) {
      return;
    }

    setIsBusy(true);
    setProjectError(null);

    try {
      const nextFiles = await scanCurrentProjectFiles();

      if (
        activeFilePathRef.current &&
        !nextFiles.some((file) => file.relativePath === activeFilePathRef.current)
      ) {
        await handleMissingActiveFile(nextFiles);
      }
    } catch (error) {
      setProjectError(toProjectErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }, [
    activeFilePathRef,
    handleMissingActiveFile,
    projectSource,
    scanCurrentProjectFiles,
    setIsBusy,
    setProjectError,
  ]);

  const revealFile = useCallback(
    async (relativePath: string) => {
      if (!projectSource || projectSource.kind !== "tauri") {
        setProjectError("Reveal is only available in the desktop app.");
        return;
      }

      try {
        setProjectError(null);
        await revealItemInDir(
          `${projectSource.path.replace(/[\\/]$/, "")}/${relativePath}`,
        );
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      }
    },
    [projectSource, setProjectError],
  );

  const deleteFile = useCallback(
    async (relativePath: string) => {
      if (!projectSource) {
        return;
      }

      if (!window.confirm(`Delete ${relativePath}?`)) {
        return;
      }

      setIsBusy(true);
      setProjectError(null);

      try {
        projectFilesRef.current = await deleteWorkspaceFile({
          relativePath,
          refs: {
            activeFilePath: activeFilePathRef.current,
            browserDirectoryHandle: browserDirectoryHandleRef.current,
            browserFileHandles: browserFileHandlesRef.current,
            projectFiles: projectFilesRef.current,
            source: projectSource,
          },
          source: projectSource,
          state: {
            setActiveFile,
            setCurrentLine,
            setMarkdown,
            setProjectFiles,
            setSavedMarkdown,
          },
          focusEditor,
        });
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      projectFilesRef,
      projectSource,
      setActiveFile,
      setCurrentLine,
      setIsBusy,
      setMarkdown,
      setProjectError,
      setProjectFiles,
      setSavedMarkdown,
    ],
  );

  const deleteFolder = useCallback(
    async (folderPath: string) => {
      if (!projectSource) {
        return;
      }

      const normalizedFolderPath = normalizeFolderPath(folderPath);

      if (!normalizedFolderPath) {
        setProjectError("Folder paths must stay inside the project folder.");
        return;
      }

      const folderFiles = getFolderFiles(projectFilesRef.current, normalizedFolderPath);

      if (folderFiles.length === 0) {
        setProjectError("No Markdown files were found in that folder.");
        return;
      }

      if (
        !window.confirm(
          `Delete ${normalizedFolderPath} and ${folderFiles.length} Markdown file(s)?`,
        )
      ) {
        return;
      }

      const activeFilePath = activeFilePathRef.current;

      setIsBusy(true);
      setProjectError(null);

      try {
        if (projectSource.kind === "tauri") {
          await deleteProjectFolder(projectSource.path, normalizedFolderPath);
        } else if (browserDirectoryHandleRef.current) {
          await deleteBrowserProjectFolder(
            browserDirectoryHandleRef.current,
            browserFileHandlesRef.current,
            normalizedFolderPath,
          );
        } else {
          throw new Error("Open a browser project folder before deleting folders.");
        }

        const nextFiles = await scanCurrentProjectFiles();

        if (activeFilePath && activeFilePath.startsWith(`${normalizedFolderPath}/`)) {
          await handleMissingActiveFile(nextFiles);
        }
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      handleMissingActiveFile,
      projectFilesRef,
      projectSource,
      scanCurrentProjectFiles,
      setIsBusy,
      setProjectError,
    ],
  );

  const renameFile = useCallback(
    async (relativePath: string, nextRelativePath?: string) => {
      if (!projectSource) {
        return;
      }

      const requestedPath =
        nextRelativePath ?? window.prompt("Rename Markdown file", relativePath);

      if (requestedPath === null) {
        return;
      }

      const nextPath = normalizeProjectFilePath(requestedPath);

      if (!nextPath) {
        setProjectError("File names must be safe relative .md or .markdown paths.");
        return;
      }

      setIsBusy(true);
      setProjectError(null);

      try {
        projectFilesRef.current = await renameWorkspaceFile({
          oldRelativePath: relativePath,
          newRelativePath: nextPath,
          refs: {
            activeFilePath: activeFilePathRef.current,
            browserDirectoryHandle: browserDirectoryHandleRef.current,
            browserFileHandles: browserFileHandlesRef.current,
            projectFiles: projectFilesRef.current,
            source: projectSource,
          },
          source: projectSource,
          state: {
            setActiveFile,
            setProjectFiles,
          },
        });
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      projectFilesRef,
      projectSource,
      setActiveFile,
      setIsBusy,
      setProjectError,
      setProjectFiles,
    ],
  );

  const renameFolder = useCallback(
    async (folderPath: string, nextFolderPath?: string) => {
      if (!projectSource) {
        return;
      }

      const normalizedFolderPath = normalizeFolderPath(folderPath);

      if (!normalizedFolderPath) {
        setProjectError("Folder paths must stay inside the project folder.");
        return;
      }

      const requestedPath =
        nextFolderPath ?? window.prompt("Rename folder", normalizedFolderPath);

      if (requestedPath === null) {
        return;
      }

      const normalizedNextFolderPath = normalizeFolderPath(requestedPath);

      if (!normalizedNextFolderPath) {
        setProjectError("Folder paths must stay inside the project folder.");
        return;
      }

      if (normalizedNextFolderPath === normalizedFolderPath) {
        return;
      }

      if (normalizedNextFolderPath.startsWith(`${normalizedFolderPath}/`)) {
        setProjectError("Folder cannot be renamed into itself.");
        return;
      }

      const folderFiles = getFolderFiles(projectFilesRef.current, normalizedFolderPath);

      if (folderFiles.length === 0) {
        setProjectError("No Markdown files were found in that folder.");
        return;
      }

      const activeFilePath = activeFilePathRef.current;
      const renamedActiveFilePath =
        activeFilePath && activeFilePath.startsWith(`${normalizedFolderPath}/`)
          ? movePathToRenamedFolder(
              activeFilePath,
              normalizedFolderPath,
              normalizedNextFolderPath,
            )
          : null;

      setIsBusy(true);
      setProjectError(null);

      try {
        if (projectSource.kind === "tauri") {
          await renameProjectFolder(
            projectSource.path,
            normalizedFolderPath,
            normalizedNextFolderPath,
          );
        } else if (browserDirectoryHandleRef.current) {
          await renameBrowserProjectFolder(
            browserDirectoryHandleRef.current,
            browserFileHandlesRef.current,
            normalizedFolderPath,
            normalizedNextFolderPath,
          );
        } else {
          throw new Error("Open a browser project folder before renaming folders.");
        }

        const nextFiles = await scanCurrentProjectFiles();

        if (
          renamedActiveFilePath &&
          nextFiles.some((file) => file.relativePath === renamedActiveFilePath)
        ) {
          setActiveFile(renamedActiveFilePath);
          rememberActiveProjectFile(projectSource, renamedActiveFilePath);
        } else if (
          activeFilePath &&
          !nextFiles.some((file) => file.relativePath === activeFilePath)
        ) {
          await handleMissingActiveFile(nextFiles);
        }
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      handleMissingActiveFile,
      projectFilesRef,
      projectSource,
      scanCurrentProjectFiles,
      setActiveFile,
      setIsBusy,
      setProjectError,
    ],
  );

  return {
    createNewFile,
    createNewFolder,
    deleteFile,
    deleteFolder,
    handleManualSave,
    handleMissingActiveFile,
    moveProjectFile,
    openProjectFolder,
    openQuickFileSwitcher,
    openRecentProject,
    refreshProject,
    renameFile,
    renameFolder,
    revealFile,
    saveActiveDocument,
    scanBrowserFolderForChanges,
    switchFile,
    switchToNextFile,
  };
}
