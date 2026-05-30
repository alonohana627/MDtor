import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { starterMarkdown } from "../data/starterMarkdown";
import {
  readBrowserProjectAsset,
  isBrowserProjectFolderPickerSupported,
  type BrowserProjectFile,
} from "../services/browserProjectFiles";
import { readProjectAsset, type ProjectFile } from "../services/projectFiles";
import { loadRecentProjects, type RecentProject } from "../services/projectPersistence";
import { type ProjectSource } from "../project/projectTypes";
import { useProjectKeyboardShortcuts } from "./useProjectKeyboardShortcuts";
import { useProjectPolling } from "./useProjectPolling";
import { useProjectWorkspaceActions } from "./useProjectWorkspaceActions";
import {
  handleRestoreWorkspaceError,
  restoreWorkspaceProject,
} from "./useProjectWorkspaceHelpers";

export function useProjectWorkspace() {
  const [markdown, setMarkdown] = useState(starterMarkdown);
  const [savedMarkdown, setSavedMarkdown] = useState(starterMarkdown);
  const [currentLine, setCurrentLine] = useState(1);
  const [projectSource, setProjectSource] = useState<ProjectSource | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() =>
    loadRecentProjects(),
  );

  const activeFilePathRef = useRef<string | null>(null);
  const browserFileHandlesRef = useRef(new Map<string, BrowserProjectFile>());
  const browserDirectoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const projectFilesRef = useRef<ProjectFile[]>([]);
  const isPollingProjectRef = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isDirty = markdown !== savedMarkdown;

  const focusEditor = useCallback(() => {
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }, []);

  const setActiveFile = useCallback((relativePath: string | null) => {
    activeFilePathRef.current = relativePath;
    setActiveFilePath(relativePath);
  }, []);

  const loadProjectImage = useCallback(
    async (assetPath: string) => {
      if (!projectSource || !activeFilePathRef.current) {
        throw new Error("Open a project file before previewing local images.");
      }

      if (projectSource.kind === "tauri") {
        const asset = await readProjectAsset(
          projectSource.path,
          activeFilePathRef.current,
          assetPath,
        );

        return new Blob([new Uint8Array(asset.bytes)], { type: asset.mimeType });
      }

      if (!browserDirectoryHandleRef.current) {
        throw new Error("Open a browser project folder before previewing local images.");
      }

      return readBrowserProjectAsset(
        browserDirectoryHandleRef.current,
        activeFilePathRef.current,
        assetPath,
      );
    },
    [projectSource],
  );

  const {
    createNewFile,
    deleteFile,
    handleManualSave,
    handleMissingActiveFile,
    moveProjectFile,
    openProjectFolder,
    openQuickFileSwitcher,
    openRecentProject,
    renameFile,
    scanBrowserFolderForChanges,
    switchFile,
    switchToNextFile,
  } = useProjectWorkspaceActions({
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
    setRecentProjects,
    setSavedMarkdown,
  });

  useEffect(() => {
    projectFilesRef.current = projectFiles;
  }, [projectFiles]);

  useEffect(() => {
    let isCancelled = false;

    async function restoreLastProject() {
      setIsBusy(true);
      setProjectError(null);

      try {
        await restoreWorkspaceProject({
          isTauriRuntime: isTauri(),
          isBrowserFolderPickerSupported: isBrowserProjectFolderPickerSupported(),
          isCancelled: () => isCancelled,
          refs: {
            browserFileHandles: browserFileHandlesRef.current,
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
        handleRestoreWorkspaceError(error, isTauri(), isCancelled, setProjectError);
      } finally {
        if (!isCancelled) {
          setIsBusy(false);
        }
      }
    }

    restoreLastProject();

    return () => {
      isCancelled = true;
    };
  }, [focusEditor, setActiveFile]);

  useProjectPolling({
    activeFilePathRef,
    isPollingProjectRef,
    projectFilesRef,
    projectSource,
    scanBrowserFolderForChanges,
    handleMissingActiveFile,
    setProjectError,
    setProjectFiles,
  });

  useProjectKeyboardShortcuts({
    activeFilePathRef,
    createNewFile,
    handleManualSave,
    isBusy,
    openProjectFolder,
    openQuickFileSwitcher,
    isProjectOpen: Boolean(projectSource),
    switchToNextFile,
  });

  return {
    activeFilePath,
    createNewFile,
    currentLine,
    deleteFile,
    editorRef,
    handleManualSave,
    isBusy,
    isDirty,
    loadProjectImage,
    markdown,
    moveProjectFile,
    openProjectFolder,
    openRecentProject,
    projectError,
    projectFiles,
    projectSource,
    recentProjects,
    renameFile,
    setCurrentLine,
    setMarkdown,
    switchFile,
  };
}
