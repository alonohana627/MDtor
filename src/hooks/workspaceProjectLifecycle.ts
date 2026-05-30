import { open } from "@tauri-apps/plugin-dialog";
import {
  openBrowserProjectFolder,
  scanBrowserProjectFolder,
} from "../services/browserProjectFiles";
import {
  clearLastTauriProjectPath,
  loadLastBrowserDirectoryHandle,
  loadLastTauriProjectPath,
  saveLastBrowserDirectoryHandle,
  saveLastTauriProjectPath,
} from "../services/projectPersistence";
import { scanProjectFolder } from "../services/projectFiles";
import { loadProjectState, toProjectErrorMessage } from "./workspaceCore";
import {
  type WorkspaceEffects,
  type WorkspaceRefs,
  type WorkspaceState,
} from "./workspaceTypes";

type RestoreProjectParams = {
  isTauriRuntime: boolean;
  isBrowserFolderPickerSupported: boolean;
  isCancelled: () => boolean;
  refs: Pick<WorkspaceRefs, "browserFileHandles">;
  state: WorkspaceState;
  effects: Pick<
    WorkspaceEffects,
    | "focusEditor"
    | "setBrowserDirectoryHandle"
    | "setBrowserFileHandles"
    | "setProjectError"
  >;
};

const FIREFOX_FOLDER_ERROR =
  "Firefox does not support opening local folders for direct editing from a web app. Use the Tauri desktop app for native folder opening, or Chrome/Edge in browser mode.";

export async function openWorkspaceFolder({
  isTauriRuntime,
  isBrowserFolderPickerSupported,
  saveActiveDocument,
  refs,
  state,
  effects,
}: {
  isTauriRuntime: boolean;
  isBrowserFolderPickerSupported: boolean;
  saveActiveDocument: () => Promise<void>;
  refs: WorkspaceRefs;
  state: WorkspaceState;
  effects: WorkspaceEffects;
}) {
  if (isTauriRuntime) {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: "Open writing project",
    });

    if (!selectedPath) {
      return;
    }

    await saveActiveDocument();
    effects.setBrowserDirectoryHandle(null);
    effects.setBrowserFileHandles(new Map());
    await loadProjectState({
      source: { kind: "tauri", path: selectedPath },
      files: await scanProjectFolder(selectedPath),
      refs,
      state,
      focusEditor: effects.focusEditor,
    });
    saveLastTauriProjectPath(selectedPath);
    return;
  }

  if (!isBrowserFolderPickerSupported) {
    effects.setProjectError(FIREFOX_FOLDER_ERROR);
    return;
  }

  const browserProject = await openBrowserProjectFolder();

  if (!browserProject) {
    return;
  }

  await saveActiveDocument();
  effects.setBrowserFileHandles(browserProject.fileHandles);
  await loadProjectState({
    source: {
      kind: "browser",
      name: browserProject.name,
      id: browserProject.id,
    },
    files: browserProject.files,
    refs: {
      ...refs,
      browserFileHandles: browserProject.fileHandles,
    },
    state,
    focusEditor: effects.focusEditor,
  });
  effects.setBrowserDirectoryHandle(browserProject.directoryHandle);
  await saveLastBrowserDirectoryHandle(
    browserProject.directoryHandle,
    browserProject.id,
  ).catch(() => {
    // Browser handle persistence is best effort; opening the folder still succeeded.
  });
}

export async function restoreWorkspaceProject({
  isTauriRuntime,
  isBrowserFolderPickerSupported,
  isCancelled,
  refs,
  state,
  effects,
}: RestoreProjectParams) {
  if (isTauriRuntime) {
    const lastProjectPath = loadLastTauriProjectPath();

    if (!lastProjectPath || isCancelled()) {
      return;
    }

    await loadProjectState({
      source: { kind: "tauri", path: lastProjectPath },
      files: await scanProjectFolder(lastProjectPath),
      refs,
      state,
      focusEditor: effects.focusEditor,
      shouldApply: () => !isCancelled(),
    });
    return;
  }

  if (!isBrowserFolderPickerSupported) {
    return;
  }

  const persistedDirectory = await loadLastBrowserDirectoryHandle();

  if (!persistedDirectory || isCancelled()) {
    return;
  }

  const { directoryHandle, id } = persistedDirectory;
  const browserProject = await scanBrowserProjectFolder(directoryHandle);
  effects.setBrowserDirectoryHandle(directoryHandle);
  effects.setBrowserFileHandles(browserProject.fileHandles);
  await loadProjectState({
    source: { kind: "browser", name: directoryHandle.name, id },
    files: browserProject.files,
    refs: {
      ...refs,
      browserFileHandles: browserProject.fileHandles,
    },
    state,
    focusEditor: effects.focusEditor,
    shouldApply: () => !isCancelled(),
  });
}

export function handleRestoreWorkspaceError(
  error: unknown,
  isTauriRuntime: boolean,
  isCancelled: boolean,
  setProjectError: (error: string) => void,
) {
  if (isTauriRuntime) {
    clearLastTauriProjectPath();
  }

  if (!isCancelled) {
    setProjectError(toProjectErrorMessage(error));
  }
}
