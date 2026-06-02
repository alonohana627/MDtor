import { type ProjectSource } from "../../project/projectTypes";
import { type BrowserProjectFile } from "../../services/browserProjectFiles";
import { type ProjectFile } from "../../services/projectFiles";
import { type RecentProject } from "../../services/projectPersistence";

export type WorkspaceActionsParams = {
  markdown: string;
  projectSource: ProjectSource | null;
  isDirty: boolean;
  activeFilePathRef: { current: string | null };
  browserDirectoryHandleRef: { current: FileSystemDirectoryHandle | null };
  browserFileHandlesRef: { current: Map<string, BrowserProjectFile> };
  projectFilesRef: { current: ProjectFile[] };
  focusEditor: () => void;
  setActiveFile: (relativePath: string | null) => void;
  setCurrentLine: (line: number) => void;
  setIsBusy: (value: boolean) => void;
  setMarkdown: (value: string) => void;
  setProjectError: (value: string | null) => void;
  setProjectFiles: (
    files: ProjectFile[] | ((files: ProjectFile[]) => ProjectFile[]),
  ) => void;
  setProjectSource: (source: ProjectSource | null) => void;
  setSavedMarkdown: (value: string) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
};

export type BusyProjectActionRunner = (action: () => Promise<void>) => Promise<void>;

export type SaveActiveDocument = (content?: string) => Promise<void>;

export type ScanCurrentProjectFiles = () => Promise<ProjectFile[]>;

export type HandleMissingActiveFile = (files: ProjectFile[]) => Promise<void>;
