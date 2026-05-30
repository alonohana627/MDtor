import { type ProjectSource } from "../project/projectTypes";
import {
  createBrowserProjectFile,
  deleteBrowserProjectFile,
} from "../services/browserProjectFiles";
import {
  createProjectFile,
  deleteProjectFile,
  type ProjectFile,
} from "../services/projectFiles";
import { readWorkspaceDocument, rememberActiveProjectFile } from "./workspaceCore";
import { type WorkspaceRefs, type WorkspaceState } from "./workspaceTypes";

type SwitchFileParams = {
  relativePath: string;
  isDirty: boolean;
  refs: WorkspaceRefs;
  state: Pick<
    WorkspaceState,
    "setActiveFile" | "setCurrentLine" | "setMarkdown" | "setSavedMarkdown"
  >;
  focusEditor: () => void;
  saveActiveDocument: () => Promise<void>;
};

type CreateFileParams = {
  source: ProjectSource;
  relativePath: string;
  isDirty: boolean;
  refs: WorkspaceRefs;
  state: Pick<
    WorkspaceState,
    | "setActiveFile"
    | "setCurrentLine"
    | "setMarkdown"
    | "setProjectFiles"
    | "setSavedMarkdown"
  >;
  focusEditor: () => void;
  saveActiveDocument: () => Promise<void>;
};

type DeleteFileParams = {
  relativePath: string;
  refs: WorkspaceRefs;
  source: ProjectSource;
  state: Pick<
    WorkspaceState,
    | "setActiveFile"
    | "setCurrentLine"
    | "setMarkdown"
    | "setProjectFiles"
    | "setSavedMarkdown"
  >;
  focusEditor: () => void;
};

type MissingActiveFileParams = {
  files: ProjectFile[];
  refs: Pick<WorkspaceRefs, "browserFileHandles">;
  source: ProjectSource;
  state: Pick<
    WorkspaceState,
    "setActiveFile" | "setCurrentLine" | "setMarkdown" | "setSavedMarkdown"
  >;
  focusEditor: () => void;
};

export async function switchWorkspaceFile({
  relativePath,
  isDirty,
  refs,
  state,
  focusEditor,
  saveActiveDocument,
}: SwitchFileParams) {
  if (!refs.source || relativePath === refs.activeFilePath) {
    return false;
  }

  if (isDirty) {
    await saveActiveDocument();
  }

  const markdown = await readWorkspaceDocument(
    refs.source,
    refs.browserFileHandles,
    relativePath,
  );

  state.setActiveFile(relativePath);
  rememberActiveProjectFile(refs.source, relativePath);
  state.setMarkdown(markdown);
  state.setSavedMarkdown(markdown);
  state.setCurrentLine(1);
  focusEditor();
  return true;
}

export async function createWorkspaceFile({
  source,
  relativePath,
  isDirty,
  refs,
  state,
  focusEditor,
  saveActiveDocument,
}: CreateFileParams) {
  if (isDirty) {
    await saveActiveDocument();
  }

  if (source.kind === "tauri") {
    await createProjectFile(source.path, relativePath);
  } else if (refs.browserDirectoryHandle) {
    await createBrowserProjectFile(
      refs.browserDirectoryHandle,
      refs.browserFileHandles,
      relativePath,
    );
  } else {
    throw new Error("Open a browser project folder before creating files.");
  }

  const nextFiles = [...refs.projectFiles, { relativePath }];
  state.setProjectFiles(nextFiles);
  state.setActiveFile(relativePath);
  rememberActiveProjectFile(source, relativePath);
  state.setMarkdown("");
  state.setSavedMarkdown("");
  state.setCurrentLine(1);
  focusEditor();

  return nextFiles;
}

export function reorderProjectFiles(
  files: ProjectFile[],
  relativePath: string,
  direction: "up" | "down",
) {
  const currentIndex = files.findIndex((file) => file.relativePath === relativePath);
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= files.length) {
    return files;
  }

  const nextFiles = [...files];
  const [file] = nextFiles.splice(currentIndex, 1);
  nextFiles.splice(nextIndex, 0, file);
  return nextFiles;
}

export function findQuickSwitchFile(files: ProjectFile[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  return (
    files.find((file) => file.relativePath.toLowerCase() === normalizedQuery) ??
    files.find((file) => file.relativePath.toLowerCase().includes(normalizedQuery)) ??
    null
  );
}

export function getNextProjectFilePath(
  files: ProjectFile[],
  activeFilePath: string | null,
) {
  if (files.length < 2) {
    return null;
  }

  const currentIndex = files.findIndex((file) => file.relativePath === activeFilePath);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % files.length : 0;
  return files[nextIndex]?.relativePath ?? null;
}

export function removeProjectFile(files: ProjectFile[], relativePath: string) {
  const deletedIndex = files.findIndex((file) => file.relativePath === relativePath);
  const nextFiles = files.filter((file) => file.relativePath !== relativePath);
  const fallbackFile =
    nextFiles[Math.min(Math.max(deletedIndex, 0), nextFiles.length - 1)] ?? null;

  return {
    fallbackFile,
    nextFiles,
  };
}

export async function applyActiveFileFallback({
  files,
  refs,
  source,
  state,
  focusEditor,
}: MissingActiveFileParams) {
  const fallbackFile = files[0] ?? null;

  if (fallbackFile) {
    const markdown = await readWorkspaceDocument(
      source,
      refs.browserFileHandles,
      fallbackFile.relativePath,
    );
    state.setActiveFile(fallbackFile.relativePath);
    rememberActiveProjectFile(source, fallbackFile.relativePath);
    state.setMarkdown(markdown);
    state.setSavedMarkdown(markdown);
    focusEditor();
  } else {
    state.setActiveFile(null);
    rememberActiveProjectFile(source, null);
    state.setMarkdown("");
    state.setSavedMarkdown("");
  }

  state.setCurrentLine(1);
}

export async function deleteWorkspaceFile({
  relativePath,
  refs,
  source,
  state,
  focusEditor,
}: DeleteFileParams) {
  if (source.kind === "tauri") {
    await deleteProjectFile(source.path, relativePath);
  } else if (refs.browserDirectoryHandle) {
    await deleteBrowserProjectFile(
      refs.browserDirectoryHandle,
      refs.browserFileHandles,
      relativePath,
    );
  } else {
    throw new Error("Open a browser project folder before deleting files.");
  }

  const { fallbackFile, nextFiles } = removeProjectFile(refs.projectFiles, relativePath);

  state.setProjectFiles(nextFiles);

  if (refs.activeFilePath !== relativePath) {
    return nextFiles;
  }

  await applyActiveFileFallback({
    files: fallbackFile ? [fallbackFile] : [],
    refs,
    source,
    state,
    focusEditor,
  });

  return nextFiles;
}
