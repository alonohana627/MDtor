import { type ProjectFile } from "../services/projectFiles";
import { type ProjectSource } from "./projectTypes";

export function getProjectLabel(projectSource: ProjectSource | null) {
  if (!projectSource) {
    return null;
  }

  return projectSource.kind === "tauri"
    ? projectSource.path
    : `${projectSource.name} (browser)`;
}

export function getProjectPersistenceId(source: ProjectSource) {
  return source.kind === "tauri" ? `tauri:${source.path}` : `browser:${source.id}`;
}

export function normalizeNewFilePath(input: string) {
  const trimmedInput = input.trim().replace(/\\/g, "/").replace(/^\/+/, "");

  if (!trimmedInput) {
    return null;
  }

  return /\.(md|markdown)$/i.test(trimmedInput) ? trimmedInput : `${trimmedInput}.md`;
}

export function reconcileProjectFiles(
  currentFiles: ProjectFile[],
  scannedFiles: ProjectFile[],
) {
  const scannedPaths = new Set(scannedFiles.map((file) => file.relativePath));
  const currentPaths = new Set(currentFiles.map((file) => file.relativePath));
  const retainedFiles = currentFiles.filter((file) =>
    scannedPaths.has(file.relativePath),
  );
  const newFiles = scannedFiles.filter((file) => !currentPaths.has(file.relativePath));

  return [...retainedFiles, ...newFiles];
}
