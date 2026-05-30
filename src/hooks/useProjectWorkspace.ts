import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { starterMarkdown } from "../data/starterMarkdown";
import {
  isBrowserProjectFolderPickerSupported,
  type BrowserProjectFile,
} from "../services/browserProjectFiles";
import { type ProjectFile } from "../services/projectFiles";
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

  const {
    createNewFile,
    deleteFile,
    handleManualSave,
    handleMissingActiveFile,
    moveProjectFile,
    openProjectFolder,
    openQuickFileSwitcher,
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
    markdown,
    moveProjectFile,
    openProjectFolder,
    projectError,
    projectFiles,
    projectSource,
    setCurrentLine,
    setMarkdown,
    switchFile,
  };
}
