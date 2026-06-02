import { useCallback } from "react";
import { normalizeProjectFilePath } from "../../project/projectUtils";
import {
  createWorkspaceFile,
  deleteWorkspaceFile,
  findQuickSwitchFile,
  getNextProjectFilePath,
  renameWorkspaceFile,
  reorderProjectFiles,
  switchWorkspaceFile,
} from "../useProjectWorkspaceHelpers";
import {
  type BusyProjectActionRunner,
  type SaveActiveDocument,
  type WorkspaceActionsParams,
} from "./types";

type WorkspaceFileActionsParams = {
  params: WorkspaceActionsParams;
  runBusyProjectAction: BusyProjectActionRunner;
  saveActiveDocument: SaveActiveDocument;
};

export function useWorkspaceFileActions({
  params,
  runBusyProjectAction,
  saveActiveDocument,
}: WorkspaceFileActionsParams) {
  const {
    projectSource,
    isDirty,
    activeFilePathRef,
    browserDirectoryHandleRef,
    browserFileHandlesRef,
    projectFilesRef,
    focusEditor,
    setActiveFile,
    setCurrentLine,
    setMarkdown,
    setProjectError,
    setProjectFiles,
    setSavedMarkdown,
  } = params;

  const switchFile = useCallback(
    async (relativePath: string) => {
      if (!projectSource || relativePath === activeFilePathRef.current) {
        return;
      }

      await runBusyProjectAction(async () => {
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
      });
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      isDirty,
      projectFilesRef,
      projectSource,
      runBusyProjectAction,
      saveActiveDocument,
      setActiveFile,
      setCurrentLine,
      setMarkdown,
      setSavedMarkdown,
    ],
  );

  const createFileAtPath = useCallback(
    async (relativePath: string) => {
      if (!projectSource) {
        setProjectError("Open a project folder before creating a Markdown file.");
        return;
      }

      await runBusyProjectAction(async () => {
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
      });
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      isDirty,
      projectFilesRef,
      projectSource,
      runBusyProjectAction,
      saveActiveDocument,
      setActiveFile,
      setCurrentLine,
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

      await runBusyProjectAction(async () => {
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
      });
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      focusEditor,
      projectFilesRef,
      projectSource,
      runBusyProjectAction,
      setActiveFile,
      setCurrentLine,
      setMarkdown,
      setProjectFiles,
      setSavedMarkdown,
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

      await runBusyProjectAction(async () => {
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
      });
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      projectFilesRef,
      projectSource,
      runBusyProjectAction,
      setActiveFile,
      setProjectError,
      setProjectFiles,
    ],
  );

  return {
    createFileAtPath,
    createNewFile,
    deleteFile,
    moveProjectFile,
    openQuickFileSwitcher,
    renameFile,
    switchFile,
    switchToNextFile,
  };
}
