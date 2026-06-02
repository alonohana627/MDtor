import { useCallback } from "react";
import { reconcileProjectFiles } from "../../project/projectUtils";
import { scanBrowserProjectFolder } from "../../services/browserProjectFiles";
import { scanProjectFolder, type ProjectFile } from "../../services/projectFiles";
import {
  applyActiveFileFallback,
  saveWorkspaceDocument,
  toProjectErrorMessage,
} from "../useProjectWorkspaceHelpers";
import {
  type HandleMissingActiveFile,
  type ScanCurrentProjectFiles,
  type SaveActiveDocument,
  type WorkspaceActionsParams,
} from "./types";

export function useWorkspaceSyncActions({
  markdown,
  projectSource,
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
}: WorkspaceActionsParams) {
  const saveActiveDocument = useCallback<SaveActiveDocument>(
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

  const scanCurrentProjectFiles = useCallback<ScanCurrentProjectFiles>(async () => {
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

  const handleMissingActiveFile = useCallback<HandleMissingActiveFile>(
    async (files) => {
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

  return {
    handleMissingActiveFile,
    saveActiveDocument,
    scanBrowserFolderForChanges,
    scanCurrentProjectFiles,
  };
}
