import { getProjectPersistenceId } from "../project/projectUtils";
import { type ProjectSource } from "../project/projectTypes";
import {
  readBrowserProjectFile,
  saveBrowserProjectFile,
  type BrowserProjectFile,
} from "../services/browserProjectFiles";
import {
  clearLastActiveProjectFile,
  loadLastActiveProjectFile,
  saveLastActiveProjectFile,
} from "../services/projectPersistence";
import {
  readProjectFile,
  saveProjectFile,
  type ProjectFile,
} from "../services/projectFiles";
import { type WorkspaceState } from "./workspaceTypes";

type SaveDocumentParams = {
  source: ProjectSource | null;
  browserFileHandles: Map<string, BrowserProjectFile>;
  activeFilePath: string | null;
  content: string;
};

type LoadProjectParams = {
  source: ProjectSource;
  files: ProjectFile[];
  refs: {
    browserFileHandles: Map<string, BrowserProjectFile>;
  };
  state: WorkspaceState;
  focusEditor: () => void;
  shouldApply?: () => boolean;
};

export function toProjectErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function rememberActiveProjectFile(
  source: ProjectSource,
  relativePath: string | null,
) {
  const projectId = getProjectPersistenceId(source);

  if (relativePath) {
    saveLastActiveProjectFile(projectId, relativePath);
    return;
  }

  clearLastActiveProjectFile(projectId);
}

export function getInitialProjectFile(source: ProjectSource, files: ProjectFile[]) {
  const lastActivePath = loadLastActiveProjectFile(getProjectPersistenceId(source));
  return files.find((file) => file.relativePath === lastActivePath) ?? files[0] ?? null;
}

export async function readWorkspaceDocument(
  source: ProjectSource,
  browserFileHandles: Map<string, BrowserProjectFile>,
  relativePath: string,
) {
  return source.kind === "tauri"
    ? readProjectFile(source.path, relativePath)
    : readBrowserProjectFile(browserFileHandles, relativePath);
}

export async function saveWorkspaceDocument({
  source,
  browserFileHandles,
  activeFilePath,
  content,
}: SaveDocumentParams) {
  if (!source || !activeFilePath) {
    return false;
  }

  if (source.kind === "tauri") {
    await saveProjectFile(source.path, activeFilePath, content);
  } else {
    await saveBrowserProjectFile(browserFileHandles, activeFilePath, content);
  }

  return true;
}

export async function loadProjectState({
  source,
  files,
  refs,
  state,
  focusEditor,
  shouldApply,
}: LoadProjectParams) {
  const initialFile = getInitialProjectFile(source, files);
  const markdown = initialFile
    ? await readWorkspaceDocument(
        source,
        refs.browserFileHandles,
        initialFile.relativePath,
      )
    : "";

  if (shouldApply && !shouldApply()) {
    return;
  }

  state.setProjectSource(source);
  state.setProjectFiles(files);
  state.setActiveFile(initialFile?.relativePath ?? null);
  state.setMarkdown(markdown);
  state.setSavedMarkdown(markdown);
  state.setCurrentLine(1);
  rememberActiveProjectFile(source, initialFile?.relativePath ?? null);
  focusEditor();
}
