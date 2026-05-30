import { useEffect } from "react";
import { type ProjectSource } from "../project/projectTypes";
import { reconcileProjectFiles } from "../project/projectUtils";
import { type ProjectFile, scanProjectFolder } from "../services/projectFiles";

type ValueRef<T> = {
  current: T;
};

type ProjectPollingParams = {
  activeFilePathRef: ValueRef<string | null>;
  isPollingProjectRef: ValueRef<boolean>;
  projectFilesRef: ValueRef<ProjectFile[]>;
  projectSource: ProjectSource | null;
  scanBrowserFolderForChanges: () => Promise<ProjectFile[]>;
  handleMissingActiveFile: (files: ProjectFile[]) => Promise<void>;
  setProjectError: (error: string) => void;
  setProjectFiles: (files: ProjectFile[]) => void;
};

export function useProjectPolling({
  activeFilePathRef,
  isPollingProjectRef,
  projectFilesRef,
  projectSource,
  scanBrowserFolderForChanges,
  handleMissingActiveFile,
  setProjectError,
  setProjectFiles,
}: ProjectPollingParams) {
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

        const nextFiles = reconcileProjectFiles(projectFilesRef.current, scannedFiles);

        projectFilesRef.current = nextFiles;
        setProjectFiles(nextFiles);

        if (
          activeFilePathRef.current &&
          !nextFiles.some((file) => file.relativePath === activeFilePathRef.current)
        ) {
          await handleMissingActiveFile(nextFiles);
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
  }, [
    activeFilePathRef,
    isPollingProjectRef,
    projectFilesRef,
    projectSource,
    scanBrowserFolderForChanges,
    handleMissingActiveFile,
    setProjectError,
    setProjectFiles,
  ]);
}
