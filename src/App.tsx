import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreviewPane } from "./components/MarkdownPreviewPane";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { starterMarkdown } from "./data/starterMarkdown";
import {
  isBrowserProjectFolderPickerSupported,
  createBrowserProjectFile,
  deleteBrowserProjectFile,
  openBrowserProjectFolder,
  readBrowserProjectFile,
  saveBrowserProjectFile,
  scanBrowserProjectFolder,
  type BrowserProjectFile,
} from "./services/browserProjectFiles";
import {
  clearLastTauriProjectPath,
  loadLastBrowserDirectoryHandle,
  loadLastTauriProjectPath,
  saveLastBrowserDirectoryHandle,
  saveLastTauriProjectPath,
} from "./services/projectPersistence";
import {
  type ProjectFile,
  createProjectFile,
  deleteProjectFile,
  readProjectFile,
  saveProjectFile,
  scanProjectFolder,
} from "./services/projectFiles";
import "./App.css";

export type Theme = "light" | "dark";
export type DocumentDirection = "ltr" | "rtl";

type ProjectSource =
  | { kind: "tauri"; path: string }
  | { kind: "browser"; name: string };

function App() {
  const [markdown, setMarkdown] = useState(starterMarkdown);
  const [savedMarkdown, setSavedMarkdown] = useState(starterMarkdown);
  const [currentLine, setCurrentLine] = useState(1);
  const [theme, setTheme] = useState<Theme>("light");
  const [direction, setDirection] = useState<DocumentDirection>("ltr");
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
  const isDirty = markdown !== savedMarkdown;
  const projectLabel =
    projectSource?.kind === "tauri"
      ? projectSource.path
      : projectSource
        ? `${projectSource.name} (browser)`
        : null;

  useEffect(() => {
    projectFilesRef.current = projectFiles;
  }, [projectFiles]);

  useEffect(() => {
    let isCancelled = false;

    async function restoreLastProject() {
      if (projectSource) {
        return;
      }

      setIsBusy(true);
      setProjectError(null);

      try {
        if (isTauri()) {
          const lastProjectPath = loadLastTauriProjectPath();

          if (!lastProjectPath || isCancelled) {
            return;
          }

          await loadProjectFiles(
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
          await loadProjectFiles(
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
  }, []);

  useEffect(() => {
    if (!projectSource) {
      return;
    }

    async function pollProjectFolder() {
      if (!projectSource || isPollingProjectRef.current) {
        return;
      }

      isPollingProjectRef.current = true;

      try {
        const scannedFiles =
          projectSource.kind === "tauri"
            ? await scanProjectFolder(projectSource.path)
            : await scanBrowserFolderForChanges();

        const nextFiles = reconcileProjectFiles(
          projectFilesRef.current,
          scannedFiles,
        );

        projectFilesRef.current = nextFiles;
        setProjectFiles(nextFiles);

        if (
          activeFilePathRef.current &&
          !nextFiles.some((file) => file.relativePath === activeFilePathRef.current)
        ) {
          setProjectError("The active file no longer exists in the project folder.");
        }
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : String(error));
      } finally {
        isPollingProjectRef.current = false;
      }
    }

    const intervalId = window.setInterval(pollProjectFolder, 1000);

    return () => {
      window.clearInterval(intervalId);
      isPollingProjectRef.current = false;
    };
  }, [projectSource]);

  async function scanBrowserFolderForChanges() {
    if (!browserDirectoryHandleRef.current) {
      return projectFilesRef.current;
    }

    const browserProject = await scanBrowserProjectFolder(
      browserDirectoryHandleRef.current,
    );
    browserFileHandlesRef.current = browserProject.fileHandles;

    return browserProject.files;
  }

  function reconcileProjectFiles(currentFiles: ProjectFile[], scannedFiles: ProjectFile[]) {
    const scannedPaths = new Set(scannedFiles.map((file) => file.relativePath));
    const currentPaths = new Set(currentFiles.map((file) => file.relativePath));
    const retainedFiles = currentFiles.filter((file) => scannedPaths.has(file.relativePath));
    const newFiles = scannedFiles.filter((file) => !currentPaths.has(file.relativePath));

    return [...retainedFiles, ...newFiles];
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  function setActiveFile(relativePath: string | null) {
    activeFilePathRef.current = relativePath;
    setActiveFilePath(relativePath);
  }

  async function readProjectDocument(
    source: ProjectSource,
    relativePath: string,
  ) {
    return source.kind === "tauri"
      ? readProjectFile(source.path, relativePath)
      : readBrowserProjectFile(browserFileHandlesRef.current, relativePath);
  }

  async function saveActiveDocument(content = markdown) {
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
  }

  async function loadProjectFiles(nextProjectSource: ProjectSource, files: ProjectFile[]) {
    const firstFile = files[0] ?? null;
    const nextMarkdown = firstFile
      ? await readProjectDocument(nextProjectSource, firstFile.relativePath)
      : "";

    setProjectSource(nextProjectSource);
    setProjectFiles(files);
    setActiveFile(firstFile?.relativePath ?? null);
    setMarkdown(nextMarkdown);
    setSavedMarkdown(nextMarkdown);
    setCurrentLine(1);
  }

  async function openProjectFolder() {
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
  }

  async function switchFile(relativePath: string) {
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
      setMarkdown(nextMarkdown);
      setSavedMarkdown(nextMarkdown);
      setCurrentLine(1);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleManualSave() {
    setIsBusy(true);
    setProjectError(null);

    try {
      await saveActiveDocument(markdown);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  function normalizeNewFilePath(input: string) {
    const trimmedInput = input.trim().replace(/\\/g, "/").replace(/^\/+/, "");

    if (!trimmedInput) {
      return null;
    }

    return /\.(md|markdown)$/i.test(trimmedInput) ? trimmedInput : `${trimmedInput}.md`;
  }

  async function createNewFile() {
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
      }

      const nextFiles = [...projectFiles, { relativePath }];
      projectFilesRef.current = nextFiles;
      setProjectFiles(nextFiles);
      setActiveFile(relativePath);
      setMarkdown("");
      setSavedMarkdown("");
      setCurrentLine(1);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  function moveProjectFile(relativePath: string, direction: "up" | "down") {
    setProjectFiles((currentFiles) => {
      const currentIndex = currentFiles.findIndex(
        (file) => file.relativePath === relativePath,
      );
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentFiles.length
      ) {
        return currentFiles;
      }

      const nextFiles = [...currentFiles];
      const [file] = nextFiles.splice(currentIndex, 1);
      nextFiles.splice(nextIndex, 0, file);
      projectFilesRef.current = nextFiles;

      return nextFiles;
    });
  }

  async function deleteFile(relativePath: string) {
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
          setMarkdown(nextMarkdown);
          setSavedMarkdown(nextMarkdown);
        } else {
          setActiveFile(null);
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
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <ProjectSidebar
        files={projectFiles}
        activeFilePath={activeFilePath}
        isDirty={isDirty}
        projectPath={projectLabel}
        isBusy={isBusy}
        error={projectError}
        onOpenProject={openProjectFolder}
        onCreateFile={createNewFile}
        onSelectFile={switchFile}
        onMoveFile={moveProjectFile}
        onDeleteFile={deleteFile}
      />
      <MarkdownEditor
        value={markdown}
        currentLine={currentLine}
        activeFilePath={activeFilePath}
        isDirty={isDirty}
        direction={direction}
        isSaveDisabled={isBusy || !activeFilePath}
        onChange={setMarkdown}
        onCurrentLineChange={setCurrentLine}
        onSave={handleManualSave}
        onDirectionChange={setDirection}
      />
      <MarkdownPreviewPane
        markdown={markdown}
        currentLine={currentLine}
        theme={theme}
        direction={direction}
      />
    </main>
  );
}

export default App;
