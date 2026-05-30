import { type ProjectFile } from "./projectFiles";

export type BrowserProjectFile = { kind: "writable"; handle: FileSystemFileHandle };

export type BrowserProject = {
  id: string;
  name: string;
  files: ProjectFile[];
  fileHandles: Map<string, BrowserProjectFile>;
  directoryHandle: FileSystemDirectoryHandle;
};

function isMarkdownFile(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  return lowerFileName.endsWith(".md") || lowerFileName.endsWith(".markdown");
}

function isImageFile(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  return (
    lowerFileName.endsWith(".png") ||
    lowerFileName.endsWith(".jpg") ||
    lowerFileName.endsWith(".jpeg") ||
    lowerFileName.endsWith(".gif") ||
    lowerFileName.endsWith(".webp") ||
    lowerFileName.endsWith(".svg")
  );
}

function parseProjectFilePath(relativePath: string, action: "create" | "delete") {
  const pathParts = relativePath.split("/").filter(Boolean);
  const fileName = pathParts.pop();

  if (
    !fileName ||
    !isMarkdownFile(fileName) ||
    pathParts.some((pathPart) => pathPart === "." || pathPart === "..") ||
    fileName === "." ||
    fileName === ".."
  ) {
    throw new Error(
      action === "create"
        ? "New files must use a safe relative .md or .markdown path."
        : "Only Markdown files inside the project folder can be deleted.",
    );
  }

  return { pathParts, fileName };
}

function getErrorName(error: unknown) {
  return typeof error === "object" && error && "name" in error ? String(error.name) : "";
}

function createBrowserProjectId(directoryName: string) {
  const randomId =
    window.crypto && "randomUUID" in window.crypto
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${directoryName}:${randomId}`;
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

  let directoryHandle: FileSystemDirectoryHandle;

  try {
    directoryHandle = await window.showDirectoryPicker({
      id: "mdtor-project-folder",
      mode: "readwrite",
    });
  } catch (error) {
    if (getErrorName(error) === "AbortError") {
      return null;
    }

    throw error;
  }

  const fileHandles = new Map<string, BrowserProjectFile>();

  await collectMarkdownFiles(directoryHandle, fileHandles);

  return {
    id: createBrowserProjectId(directoryHandle.name),
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
  const { pathParts, fileName } = parseProjectFilePath(relativePath, "create");

  let currentDirectory = directoryHandle;

  for (const directoryName of pathParts) {
    currentDirectory = await currentDirectory.getDirectoryHandle(directoryName, {
      create: true,
    });
  }

  try {
    await currentDirectory.getFileHandle(fileName);
    throw new Error("A file already exists at that path.");
  } catch (error) {
    if (getErrorName(error) !== "NotFoundError") {
      throw error;
    }
  }

  const fileHandle = await currentDirectory.getFileHandle(fileName, { create: true });
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
  const { pathParts, fileName } = parseProjectFilePath(relativePath, "delete");

  let currentDirectory = directoryHandle;

  for (const directoryName of pathParts) {
    currentDirectory = await currentDirectory.getDirectoryHandle(directoryName);
  }

  await currentDirectory.removeEntry(fileName);
  fileHandles.delete(relativePath);
}

export async function renameBrowserProjectFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileHandles: Map<string, BrowserProjectFile>,
  oldRelativePath: string,
  newRelativePath: string,
) {
  const oldFile = fileHandles.get(oldRelativePath);

  if (!oldFile) {
    throw new Error("Could not find the selected Markdown file.");
  }

  await createBrowserProjectFile(directoryHandle, fileHandles, newRelativePath);
  const content = await readBrowserProjectFile(fileHandles, oldRelativePath);
  await saveBrowserProjectFile(fileHandles, newRelativePath, content);
  await deleteBrowserProjectFile(directoryHandle, fileHandles, oldRelativePath);
}

export async function readBrowserProjectAsset(
  directoryHandle: FileSystemDirectoryHandle,
  activeFilePath: string,
  assetPath: string,
) {
  const pathParts = resolveRelativeAssetPath(activeFilePath, assetPath);
  const fileName = pathParts.pop();

  if (!fileName || !isImageFile(fileName)) {
    throw new Error("Only local image files can be previewed.");
  }

  let currentDirectory = directoryHandle;

  for (const directoryName of pathParts) {
    currentDirectory = await currentDirectory.getDirectoryHandle(directoryName);
  }

  const fileHandle = await currentDirectory.getFileHandle(fileName);
  return fileHandle.getFile();
}

function resolveRelativeAssetPath(activeFilePath: string, assetPath: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(assetPath) || assetPath.startsWith("/")) {
    throw new Error("Only relative local image paths can be previewed.");
  }

  const baseParts = activeFilePath.split("/").slice(0, -1);
  const pathParts = [...baseParts, ...assetPath.split("/")].filter(Boolean);
  const resolvedParts: string[] = [];

  for (const part of pathParts) {
    if (part === ".") {
      continue;
    }

    if (part === "..") {
      if (resolvedParts.length === 0) {
        throw new Error("Image path must stay inside the project folder.");
      }

      resolvedParts.pop();
      continue;
    }

    resolvedParts.push(part);
  }

  return resolvedParts;
}
