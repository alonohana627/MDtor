import { useCallback } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { isBrowserProjectFolderPickerSupported } from "../../services/browserProjectFiles";
import { type RecentProject } from "../../services/projectPersistence";
import {
  openRecentWorkspaceProject,
  openWorkspaceFolder,
  toProjectErrorMessage,
} from "../useProjectWorkspaceHelpers";
import {
  type BusyProjectActionRunner,
  type HandleMissingActiveFile,
  type SaveActiveDocument,
  type ScanCurrentProjectFiles,
  type WorkspaceActionsParams,
} from "./types";

type WorkspaceProjectActionsParams = {
  params: WorkspaceActionsParams;
  handleMissingActiveFile: HandleMissingActiveFile;
  runBusyProjectAction: BusyProjectActionRunner;
  saveActiveDocument: SaveActiveDocument;
  scanCurrentProjectFiles: ScanCurrentProjectFiles;
};

export function useWorkspaceProjectActions({
  params,
  handleMissingActiveFile,
  runBusyProjectAction,
  saveActiveDocument,
  scanCurrentProjectFiles,
}: WorkspaceProjectActionsParams) {
  const {
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
    setProjectSource,
    setRecentProjects,
    setSavedMarkdown,
  } = params;

  const openProjectFolder = useCallback(async () => {
    await runBusyProjectAction(async () => {
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
    });
  }, [
    activeFilePathRef,
    browserDirectoryHandleRef,
    browserFileHandlesRef,
    focusEditor,
    projectFilesRef,
    projectSource,
    runBusyProjectAction,
    saveActiveDocument,
    setActiveFile,
    setCurrentLine,
    setMarkdown,
    setProjectError,
    setProjectFiles,
    setProjectSource,
    setRecentProjects,
    setSavedMarkdown,
  ]);

  const openRecentProject = useCallback(
    async (recentProject: RecentProject) => {
      await runBusyProjectAction(async () => {
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
      saveActiveDocument,
      setActiveFile,
      setCurrentLine,
      setMarkdown,
      setProjectError,
      setProjectFiles,
      setProjectSource,
      setRecentProjects,
      setSavedMarkdown,
    ],
  );

  const handleManualSave = useCallback(async () => {
    await runBusyProjectAction(async () => {
      await saveActiveDocument(markdown);
    });
  }, [markdown, runBusyProjectAction, saveActiveDocument]);

  const refreshProject = useCallback(async () => {
    if (!projectSource) {
      return;
    }

    await runBusyProjectAction(async () => {
      const nextFiles = await scanCurrentProjectFiles();

      if (
        activeFilePathRef.current &&
        !nextFiles.some((file) => file.relativePath === activeFilePathRef.current)
      ) {
        await handleMissingActiveFile(nextFiles);
      }
    });
  }, [
    activeFilePathRef,
    handleMissingActiveFile,
    projectSource,
    runBusyProjectAction,
    scanCurrentProjectFiles,
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

  return {
    handleManualSave,
    openProjectFolder,
    openRecentProject,
    refreshProject,
    revealFile,
  };
}
