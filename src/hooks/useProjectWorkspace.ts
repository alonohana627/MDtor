import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { starterMarkdown } from "../data/starterMarkdown";
import {
  isBrowserProjectFolderPickerSupported,
  createBrowserProjectFile,
  deleteBrowserProjectFile,
  openBrowserProjectFolder,
  readBrowserProjectFile,
  saveBrowserProjectFile,
  scanBrowserProjectFolder,
  type BrowserProjectFile,
} from "../services/browserProjectFiles";
import {
  clearLastActiveProjectFile,
  clearLastTauriProjectPath,
  loadLastActiveProjectFile,
  loadLastBrowserDirectoryHandle,
  loadLastTauriProjectPath,
  saveLastActiveProjectFile,
  saveLastBrowserDirectoryHandle,
  saveLastTauriProjectPath,
} from "../services/projectPersistence";
import {
  type ProjectFile,
  createProjectFile,
  deleteProjectFile,
  readProjectFile,
  saveProjectFile,
  scanProjectFolder,
} from "../services/projectFiles";
import { getProjectPersistenceId, normalizeNewFilePath } from "../project/projectUtils";
import { type ProjectSource } from "../project/projectTypes";
import { useProjectKeyboardShortcuts } from "./useProjectKeyboardShortcuts";
import { useProjectPolling } from "./useProjectPolling";

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

  const rememberActiveProjectFile = useCallback(
    (source: ProjectSource, relativePath: string | null) => {
      const projectId = getProjectPersistenceId(source);

      if (relativePath) {
        saveLastActiveProjectFile(projectId, relativePath);
      } else {
        clearLastActiveProjectFile(projectId);
      }
    },
    [],
  );

  const getInitialProjectFile = useCallback(
    (source: ProjectSource, files: ProjectFile[]) => {
      const lastActivePath = loadLastActiveProjectFile(getProjectPersistenceId(source));

      return (
        files.find((file) => file.relativePath === lastActivePath) ?? files[0] ?? null
      );
    },
    [],
  );

  const readProjectDocument = useCallback(
    async (source: ProjectSource, relativePath: string) => {
      return source.kind === "tauri"
        ? readProjectFile(source.path, relativePath)
        : readBrowserProjectFile(browserFileHandlesRef.current, relativePath);
    },
    [],
  );

  const saveActiveDocument = useCallback(
    async (content = markdown) => {
      if (!projectSource || !activeFilePathRef.current) {
        return;
      }

      if (projectSource.kind === "tauri") {
        await saveProjectFile(projectSource.path, activeFilePathRef.current, content);
      } else {
        await saveBrowserProjectFile(
          browserFileHandlesRef.current,
          activeFilePathRef.current,
          content,
        );
      }

      setSavedMarkdown(content);
    },
    [markdown, projectSource],
  );

  const loadProjectFiles = useCallback(
    async (nextProjectSource: ProjectSource, files: ProjectFile[]) => {
      const initialFile = getInitialProjectFile(nextProjectSource, files);
      const nextMarkdown = initialFile
        ? await readProjectDocument(nextProjectSource, initialFile.relativePath)
        : "";

      projectFilesRef.current = files;
      setProjectSource(nextProjectSource);
      setProjectFiles(files);
      setActiveFile(initialFile?.relativePath ?? null);
      setMarkdown(nextMarkdown);
      setSavedMarkdown(nextMarkdown);
      setCurrentLine(1);
      rememberActiveProjectFile(nextProjectSource, initialFile?.relativePath ?? null);
      focusEditor();
    },
    [
      focusEditor,
      getInitialProjectFile,
      readProjectDocument,
      rememberActiveProjectFile,
      setActiveFile,
    ],
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
  }, []);

  const openProjectFolder = useCallback(async () => {
    setIsBusy(true);
    setProjectError(null);

    try {
      if (isTauri()) {
        const selectedPath = await open({
          directory: true,
          multiple: false,
          title: "Open writing project",
        });

        if (!selectedPath) {
          return;
        }

        await saveActiveDocument();
        browserDirectoryHandleRef.current = null;
        browserFileHandlesRef.current = new Map();
        await loadProjectFiles(
          { kind: "tauri", path: selectedPath },
          await scanProjectFolder(selectedPath),
        );
        saveLastTauriProjectPath(selectedPath);
      } else if (isBrowserProjectFolderPickerSupported()) {
        const browserProject = await openBrowserProjectFolder();

        if (!browserProject) {
          return;
        }

        await saveActiveDocument();
        browserFileHandlesRef.current = browserProject.fileHandles;
        await loadProjectFiles(
          {
            kind: "browser",
            name: browserProject.name,
          },
          browserProject.files,
        );
        browserDirectoryHandleRef.current = browserProject.directoryHandle;
        await saveLastBrowserDirectoryHandle(browserProject.directoryHandle).catch(() => {
          // Browser handle persistence is best effort; opening the folder still succeeded.
        });
      } else {
        setProjectError(
          "Firefox does not support opening local folders for direct editing from a web app. Use the Tauri desktop app for native folder opening, or Chrome/Edge in browser mode.",
        );
      }
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }, [loadProjectFiles, saveActiveDocument]);

  const switchFile = useCallback(
    async (relativePath: string) => {
      if (!projectSource || relativePath === activeFilePathRef.current) {
        return;
      }

      setIsBusy(true);
      setProjectError(null);

      try {
        if (isDirty) {
          await saveActiveDocument();
        }

        const nextMarkdown = await readProjectDocument(projectSource, relativePath);
        setActiveFile(relativePath);
        rememberActiveProjectFile(projectSource, relativePath);
        setMarkdown(nextMarkdown);
        setSavedMarkdown(nextMarkdown);
        setCurrentLine(1);
        focusEditor();
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      focusEditor,
      isDirty,
      projectSource,
      readProjectDocument,
      rememberActiveProjectFile,
      saveActiveDocument,
      setActiveFile,
    ],
  );

  const handleManualSave = useCallback(async () => {
    setIsBusy(true);
    setProjectError(null);

    try {
      await saveActiveDocument(markdown);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }, [markdown, saveActiveDocument]);

  const createNewFile = useCallback(async () => {
    if (!projectSource) {
      setProjectError("Open a project folder before creating a Markdown file.");
      return;
    }

    const requestedPath = window.prompt("New Markdown file path", "untitled.md");
    const relativePath = requestedPath ? normalizeNewFilePath(requestedPath) : null;

    if (!relativePath) {
      return;
    }

    setIsBusy(true);
    setProjectError(null);

    try {
      if (isDirty) {
        await saveActiveDocument();
      }

      if (projectSource.kind === "tauri") {
        await createProjectFile(projectSource.path, relativePath);
      } else if (browserDirectoryHandleRef.current) {
        await createBrowserProjectFile(
          browserDirectoryHandleRef.current,
          browserFileHandlesRef.current,
          relativePath,
        );
      } else {
        throw new Error("Open a browser project folder before creating files.");
      }

      const nextFiles = [...projectFilesRef.current, { relativePath }];
      projectFilesRef.current = nextFiles;
      setProjectFiles(nextFiles);
      setActiveFile(relativePath);
      rememberActiveProjectFile(projectSource, relativePath);
      setMarkdown("");
      setSavedMarkdown("");
      setCurrentLine(1);
      focusEditor();
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }, [
    focusEditor,
    isDirty,
    projectSource,
    rememberActiveProjectFile,
    saveActiveDocument,
    setActiveFile,
  ]);

  const moveProjectFile = useCallback(
    (relativePath: string, direction: "up" | "down") => {
      setProjectFiles((currentFiles) => {
        const currentIndex = currentFiles.findIndex(
          (file) => file.relativePath === relativePath,
        );
        const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentFiles.length) {
          return currentFiles;
        }

        const nextFiles = [...currentFiles];
        const [file] = nextFiles.splice(currentIndex, 1);
        nextFiles.splice(nextIndex, 0, file);
        projectFilesRef.current = nextFiles;

        return nextFiles;
      });
    },
    [],
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
    const normalizedQuery = query?.trim().toLowerCase();

    if (!normalizedQuery) {
      return;
    }

    const exactMatch = projectFilesRef.current.find(
      (file) => file.relativePath.toLowerCase() === normalizedQuery,
    );
    const partialMatches = projectFilesRef.current.filter((file) =>
      file.relativePath.toLowerCase().includes(normalizedQuery),
    );
    const nextFile = exactMatch ?? partialMatches[0];

    if (!nextFile) {
      setProjectError(`No Markdown file matches "${query}".`);
      return;
    }

    switchFile(nextFile.relativePath);
  }, [projectSource, switchFile]);

  const switchToNextFile = useCallback(() => {
    if (!projectSource || projectFilesRef.current.length < 2) {
      return;
    }

    const currentIndex = projectFilesRef.current.findIndex(
      (file) => file.relativePath === activeFilePathRef.current,
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % projectFilesRef.current.length : 0;

    switchFile(projectFilesRef.current[nextIndex].relativePath);
  }, [projectSource, switchFile]);

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
        if (projectSource.kind === "tauri") {
          await deleteProjectFile(projectSource.path, relativePath);
        } else if (browserDirectoryHandleRef.current) {
          await deleteBrowserProjectFile(
            browserDirectoryHandleRef.current,
            browserFileHandlesRef.current,
            relativePath,
          );
        } else {
          throw new Error("Open a browser project folder before deleting files.");
        }

        const deletedIndex = projectFilesRef.current.findIndex(
          (file) => file.relativePath === relativePath,
        );
        const nextFiles = projectFilesRef.current.filter(
          (file) => file.relativePath !== relativePath,
        );
        projectFilesRef.current = nextFiles;
        setProjectFiles(nextFiles);

        if (activeFilePathRef.current === relativePath) {
          const fallbackFile =
            nextFiles[Math.min(Math.max(deletedIndex, 0), nextFiles.length - 1)] ?? null;

          if (fallbackFile) {
            const nextMarkdown = await readProjectDocument(
              projectSource,
              fallbackFile.relativePath,
            );
            setActiveFile(fallbackFile.relativePath);
            rememberActiveProjectFile(projectSource, fallbackFile.relativePath);
            setMarkdown(nextMarkdown);
            setSavedMarkdown(nextMarkdown);
            focusEditor();
          } else {
            setActiveFile(null);
            rememberActiveProjectFile(projectSource, null);
            setMarkdown("");
            setSavedMarkdown("");
          }

          setCurrentLine(1);
        }
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsBusy(false);
      }
    },
    [
      focusEditor,
      projectSource,
      readProjectDocument,
      rememberActiveProjectFile,
      setActiveFile,
    ],
  );

  useEffect(() => {
    projectFilesRef.current = projectFiles;
  }, [projectFiles]);

  useEffect(() => {
    let isCancelled = false;

    async function restoreProjectFiles(
      nextProjectSource: ProjectSource,
      files: ProjectFile[],
    ) {
      const initialFile = getInitialProjectFile(nextProjectSource, files);
      const nextMarkdown = initialFile
        ? await readProjectDocument(nextProjectSource, initialFile.relativePath)
        : "";

      if (isCancelled) {
        return;
      }

      projectFilesRef.current = files;
      activeFilePathRef.current = initialFile?.relativePath ?? null;
      setProjectSource(nextProjectSource);
      setProjectFiles(files);
      setActiveFilePath(initialFile?.relativePath ?? null);
      setMarkdown(nextMarkdown);
      setSavedMarkdown(nextMarkdown);
      setCurrentLine(1);
      rememberActiveProjectFile(nextProjectSource, initialFile?.relativePath ?? null);
      focusEditor();
    }

    async function restoreLastProject() {
      setIsBusy(true);
      setProjectError(null);

      try {
        if (isTauri()) {
          const lastProjectPath = loadLastTauriProjectPath();

          if (!lastProjectPath || isCancelled) {
            return;
          }

          await restoreProjectFiles(
            { kind: "tauri", path: lastProjectPath },
            await scanProjectFolder(lastProjectPath),
          );
        } else if (isBrowserProjectFolderPickerSupported()) {
          const directoryHandle = await loadLastBrowserDirectoryHandle();

          if (!directoryHandle || isCancelled) {
            return;
          }

          const browserProject = await scanBrowserProjectFolder(directoryHandle);
          browserDirectoryHandleRef.current = directoryHandle;
          browserFileHandlesRef.current = browserProject.fileHandles;
          await restoreProjectFiles(
            { kind: "browser", name: directoryHandle.name },
            browserProject.files,
          );
        }
      } catch (error) {
        if (isTauri()) {
          clearLastTauriProjectPath();
        }

        if (!isCancelled) {
          setProjectError(error instanceof Error ? error.message : String(error));
        }
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
  }, [
    focusEditor,
    getInitialProjectFile,
    readProjectDocument,
    rememberActiveProjectFile,
  ]);

  useProjectPolling({
    activeFilePathRef,
    isPollingProjectRef,
    projectFilesRef,
    projectSource,
    scanBrowserFolderForChanges,
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
