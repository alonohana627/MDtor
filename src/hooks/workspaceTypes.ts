import { type ProjectSource } from "../project/projectTypes";
import { type BrowserProjectFile } from "../services/browserProjectFiles";
import { type ProjectFile } from "../services/projectFiles";
import { type RecentProject } from "../services/projectPersistence";

export type WorkspaceState = {
  setActiveFile: (relativePath: string | null) => void;
  setCurrentLine: (line: number) => void;
  setMarkdown: (value: string) => void;
  setProjectFiles: (files: ProjectFile[]) => void;
  setProjectSource: (source: ProjectSource | null) => void;
  setSavedMarkdown: (value: string) => void;
};

export type WorkspaceRefs = {
  activeFilePath: string | null;
  browserDirectoryHandle: FileSystemDirectoryHandle | null;
  browserFileHandles: Map<string, BrowserProjectFile>;
  projectFiles: ProjectFile[];
  source: ProjectSource | null;
};

export type WorkspaceEffects = {
  focusEditor: () => void;
  setBrowserDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setBrowserFileHandles: (handles: Map<string, BrowserProjectFile>) => void;
  setProjectError: (error: string | null) => void;
  setRecentProjects?: (projects: RecentProject[]) => void;
};
