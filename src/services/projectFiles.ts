import { invoke } from "@tauri-apps/api/core";

export type ProjectFile = {
  relativePath: string;
};

export async function scanProjectFolder(projectPath: string) {
  return invoke<ProjectFile[]>("scan_project_folder", { projectPath });
}

export async function readProjectFile(projectPath: string, relativePath: string) {
  return invoke<string>("read_project_file", { projectPath, relativePath });
}

export async function saveProjectFile(
  projectPath: string,
  relativePath: string,
  content: string,
) {
  await invoke("save_project_file", { projectPath, relativePath, content });
}

export async function createProjectFile(projectPath: string, relativePath: string) {
  await invoke("create_project_file", { projectPath, relativePath });
}

export async function deleteProjectFile(projectPath: string, relativePath: string) {
  await invoke("delete_project_file", { projectPath, relativePath });
}
