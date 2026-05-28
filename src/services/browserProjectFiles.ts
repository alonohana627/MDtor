import { type ProjectFile } from "./projectFiles";

export type BrowserProjectFile =
  { kind: "writable"; handle: FileSystemFileHandle };

export type BrowserProject = {
  name: string;
  files: ProjectFile[];
  fileHandles: Map<string, BrowserProjectFile>;
  directoryHandle: FileSystemDirectoryHandle;
};

function isMarkdownFile(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  return lowerFileName.endsWith(".md") || lowerFileName.endsWith(".markdown");
}

async function collectMarkdownFiles(
  directoryHandle: FileSystemDirectoryHandle,
  fileHandles: Map<string, BrowserProjectFile>,
  pathParts: string[] = [],
) {
  for await (const [name, handle] of directoryHandle.entries()) {
    const nextPathParts = [...pathParts, name];

    if (handle.kind === "directory") {
      await collectMarkdownFiles(handle, fileHandles, nextPathParts);
    } else if (isMarkdownFile(name)) {
      fileHandles.set(nextPathParts.join("/"), { kind: "writable", handle });
    }
  }
}

export function isBrowserProjectFolderPickerSupported() {
  return typeof window.showDirectoryPicker === "function";
}

export async function openBrowserProjectFolder(): Promise<BrowserProject | null> {
  if (!window.showDirectoryPicker) {
    throw new Error(
      "This browser cannot open local folders for direct editing. Use the Tauri desktop app or a browser with showDirectoryPicker support.",
    );
  }

  const directoryHandle = await window.showDirectoryPicker({
    id: "mdtor-project-folder",
    mode: "readwrite",
  });
  const fileHandles = new Map<string, BrowserProjectFile>();

  await collectMarkdownFiles(directoryHandle, fileHandles);

  return {
    name: directoryHandle.name,
    files: createProjectFiles(fileHandles),
    fileHandles,
    directoryHandle,
  };
}

export async function scanBrowserProjectFolder(
  directoryHandle: FileSystemDirectoryHandle,
) {
  const fileHandles = new Map<string, BrowserProjectFile>();

  await collectMarkdownFiles(directoryHandle, fileHandles);

  return {
    files: createProjectFiles(fileHandles),
    fileHandles,
  };
}

function createProjectFiles(fileHandles: Map<string, BrowserProjectFile>) {
  return Array.from(fileHandles.keys())
    .sort((left, right) => left.localeCompare(right))
    .map((relativePath) => ({ relativePath }));
}

export async function readBrowserProjectFile(
  fileHandles: Map<string, BrowserProjectFile>,
  relativePath: string,
) {
  const projectFile = fileHandles.get(relativePath);

  if (!projectFile) {
    throw new Error("Could not find the selected Markdown file.");
  }

  const file = await projectFile.handle.getFile();

  return file.text();
}

export async function saveBrowserProjectFile(
  fileHandles: Map<string, BrowserProjectFile>,
  relativePath: string,
  content: string,
) {
  const projectFile = fileHandles.get(relativePath);

  if (!projectFile) {
    throw new Error("Could not find the selected Markdown file.");
  }

  const writable = await projectFile.handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function createBrowserProjectFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileHandles: Map<string, BrowserProjectFile>,
  relativePath: string,
) {
  const pathParts = relativePath.split("/").filter(Boolean);
  const fileName = pathParts.pop();

  if (!fileName || !isMarkdownFile(fileName)) {
    throw new Error("New files must use a .md or .markdown extension.");
  }

  let currentDirectory = directoryHandle;

  for (const directoryName of pathParts) {
    currentDirectory = await currentDirectory.getDirectoryHandle(directoryName, {
      create: true,
    });
  }

  const fileHandle = await currentDirectory.getFileHandle(fileName, { create: true });
  const existingFile = await fileHandle.getFile();

  if (existingFile.size > 0) {
    throw new Error("A file already exists at that path.");
  }

  const writable = await fileHandle.createWritable();
  await writable.write("");
  await writable.close();
  fileHandles.set(relativePath, { kind: "writable", handle: fileHandle });
}

export async function deleteBrowserProjectFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileHandles: Map<string, BrowserProjectFile>,
  relativePath: string,
) {
  const pathParts = relativePath.split("/").filter(Boolean);
  const fileName = pathParts.pop();

  if (!fileName || !isMarkdownFile(fileName)) {
    throw new Error("Only Markdown files can be deleted.");
  }

  let currentDirectory = directoryHandle;

  for (const directoryName of pathParts) {
    currentDirectory = await currentDirectory.getDirectoryHandle(directoryName);
  }

  await currentDirectory.removeEntry(fileName);
  fileHandles.delete(relativePath);
}
