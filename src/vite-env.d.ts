/// <reference types="vite/client" />

declare module "markdown-it-footnote" {
  import MarkdownIt = require("markdown-it");

  const markdownItFootnote: MarkdownIt.PluginSimple;

  export default markdownItFootnote;
}

declare module "markdown-it-task-lists" {
  import MarkdownIt = require("markdown-it");

  type TaskListOptions = {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  };

  const markdownItTaskLists: MarkdownIt.PluginWithOptions<TaskListOptions>;

  export default markdownItTaskLists;
}

type BrowserFileSystemPermissionMode = "read" | "readwrite";

type BrowserDirectoryPickerOptions = {
  id?: string;
  mode?: BrowserFileSystemPermissionMode;
  startIn?: WellKnownDirectory | FileSystemHandle;
};

type BrowserSaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<
    [string, FileSystemDirectoryHandle | FileSystemFileHandle]
  >;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

interface FileSystemHandle {
  queryPermission?: (descriptor?: {
    mode?: BrowserFileSystemPermissionMode;
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: {
    mode?: BrowserFileSystemPermissionMode;
  }) => Promise<PermissionState>;
}

interface Window {
  showDirectoryPicker?: (
    options?: BrowserDirectoryPickerOptions,
  ) => Promise<FileSystemDirectoryHandle>;
  showSaveFilePicker?: (
    options?: BrowserSaveFilePickerOptions,
  ) => Promise<FileSystemFileHandle>;
}
