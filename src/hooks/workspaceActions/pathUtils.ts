import { type ProjectFile } from "../../services/projectFiles";

export function normalizeFolderPath(input: string) {
  const normalizedPath = input
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (
    !normalizedPath ||
    normalizedPath.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    return null;
  }

  return normalizedPath;
}

export function getFolderFiles(files: ProjectFile[], folderPath: string) {
  return files.filter((file) => file.relativePath.startsWith(`${folderPath}/`));
}

export function movePathToRenamedFolder(
  relativePath: string,
  oldFolderPath: string,
  newFolderPath: string,
) {
  return `${newFolderPath}${relativePath.slice(oldFolderPath.length)}`;
}
