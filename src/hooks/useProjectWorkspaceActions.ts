import { useCallback } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  isBrowserProjectFolderPickerSupported,
  scanBrowserProjectFolder,
  type BrowserProjectFile,
} from "../services/browserProjectFiles";
import { type ProjectFile } from "../services/projectFiles";
import { type RecentProject } from "../services/projectPersistence";
import { normalizeProjectFilePath } from "../project/projectUtils";
import { type ProjectSource } from "../project/projectTypes";
import {
  applyActiveFileFallback,
  createWorkspaceFile,
  deleteWorkspaceFile,
  findQuickSwitchFile,
  getNextProjectFilePath,
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

  const createNewFile = useCallback(async () => {
    if (!projectSource) {
      setProjectError("Open a project folder before creating a Markdown file.");
      return;
    }

    const requestedPath = window.prompt("New Markdown file path", "untitled.md");
    const relativePath = requestedPath
      ? normalizeProjectFilePath(requestedPath)
      : null;

    if (!relativePath) {
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
  }, [
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
  ]);

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

  const renameFile = useCallback(
    async (relativePath: string) => {
      if (!projectSource) {
        return;
      }

      const requestedPath = window.prompt("Rename Markdown file", relativePath);
      const nextPath = requestedPath ? normalizeProjectFilePath(requestedPath) : null;

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

  return {
    createNewFile,
    deleteFile,
    handleManualSave,
    handleMissingActiveFile,
    moveProjectFile,
    openProjectFolder,
    openQuickFileSwitcher,
    openRecentProject,
    renameFile,
    saveActiveDocument,
    scanBrowserFolderForChanges,
    switchFile,
    switchToNextFile,
  };
}
