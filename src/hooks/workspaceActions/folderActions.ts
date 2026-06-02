import { useCallback } from "react";
import { normalizeProjectFilePath } from "../../project/projectUtils";
import {
  deleteBrowserProjectFolder,
  renameBrowserProjectFolder,
} from "../../services/browserProjectFiles";
import { deleteProjectFolder, renameProjectFolder } from "../../services/projectFiles";
import { rememberActiveProjectFile } from "../useProjectWorkspaceHelpers";
import {
  getFolderFiles,
  movePathToRenamedFolder,
  normalizeFolderPath,
} from "./pathUtils";
import {
  type BusyProjectActionRunner,
  type HandleMissingActiveFile,
  type ScanCurrentProjectFiles,
  type WorkspaceActionsParams,
} from "./types";

type WorkspaceFolderActionsParams = {
  params: WorkspaceActionsParams;
  createFileAtPath: (relativePath: string) => Promise<void>;
  handleMissingActiveFile: HandleMissingActiveFile;
  runBusyProjectAction: BusyProjectActionRunner;
  scanCurrentProjectFiles: ScanCurrentProjectFiles;
};

export function useWorkspaceFolderActions({
  params,
  createFileAtPath,
  handleMissingActiveFile,
  runBusyProjectAction,
  scanCurrentProjectFiles,
}: WorkspaceFolderActionsParams) {
  const {
    projectSource,
    activeFilePathRef,
    browserDirectoryHandleRef,
    browserFileHandlesRef,
    projectFilesRef,
    setActiveFile,
    setProjectError,
  } = params;

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

      await runBusyProjectAction(async () => {
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
      });
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      handleMissingActiveFile,
      projectFilesRef,
      projectSource,
      runBusyProjectAction,
      scanCurrentProjectFiles,
      setProjectError,
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

      await runBusyProjectAction(async () => {
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
      });
    },
    [
      activeFilePathRef,
      browserDirectoryHandleRef,
      browserFileHandlesRef,
      handleMissingActiveFile,
      projectFilesRef,
      projectSource,
      runBusyProjectAction,
      scanCurrentProjectFiles,
      setActiveFile,
      setProjectError,
    ],
  );

  return {
    createNewFolder,
    deleteFolder,
    renameFolder,
  };
}
