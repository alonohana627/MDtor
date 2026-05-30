const LAST_TAURI_PROJECT_PATH_KEY = "mdtor:last-tauri-project-path";
const LAST_ACTIVE_PROJECT_FILE_PREFIX = "mdtor:last-active-project-file:";
const DB_NAME = "mdtor-project-state";
const DB_VERSION = 1;
const STORE_NAME = "project-handles";
const LAST_BROWSER_DIRECTORY_KEY = "last-browser-directory";

export type PersistedBrowserDirectory = {
  id: string;
  directoryHandle: FileSystemDirectoryHandle;
};

export function saveLastTauriProjectPath(projectPath: string) {
  window.localStorage.setItem(LAST_TAURI_PROJECT_PATH_KEY, projectPath);
}

export function loadLastTauriProjectPath() {
  return window.localStorage.getItem(LAST_TAURI_PROJECT_PATH_KEY);
}

export function clearLastTauriProjectPath() {
  window.localStorage.removeItem(LAST_TAURI_PROJECT_PATH_KEY);
}

function getLastActiveProjectFileKey(projectId: string) {
  return `${LAST_ACTIVE_PROJECT_FILE_PREFIX}${projectId}`;
}

export function saveLastActiveProjectFile(projectId: string, relativePath: string) {
  window.localStorage.setItem(getLastActiveProjectFileKey(projectId), relativePath);
}

export function loadLastActiveProjectFile(projectId: string) {
  return window.localStorage.getItem(getLastActiveProjectFileKey(projectId));
}

export function clearLastActiveProjectFile(projectId: string) {
  window.localStorage.removeItem(getLastActiveProjectFileKey(projectId));
}

function openProjectStateDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getProjectStateDbValue<T>(key: string) {
  const db = await openProjectStateDb();

  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function setProjectStateDbValue<T>(key: string, value: T) {
  const db = await openProjectStateDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).put(value, key);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function isPersistedBrowserDirectory(value: unknown): value is PersistedBrowserDirectory {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "directoryHandle" in value
  );
}

export async function saveLastBrowserDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle,
  id: string,
) {
  if (!window.indexedDB) {
    return;
  }

  await setProjectStateDbValue(LAST_BROWSER_DIRECTORY_KEY, {
    id,
    directoryHandle,
  });
}

export async function loadLastBrowserDirectoryHandle() {
  if (!window.indexedDB) {
    return null;
  }

  const persistedValue = await getProjectStateDbValue<
    FileSystemDirectoryHandle | PersistedBrowserDirectory
  >(LAST_BROWSER_DIRECTORY_KEY);

  if (!persistedValue) {
    return null;
  }

  const directoryHandle = isPersistedBrowserDirectory(persistedValue)
    ? persistedValue.directoryHandle
    : persistedValue;
  const id = isPersistedBrowserDirectory(persistedValue)
    ? persistedValue.id
    : directoryHandle.name;

  const permission = await directoryHandle.requestPermission?.({
    mode: "readwrite",
  });

  return permission === "denied" ? null : { id, directoryHandle };
}
