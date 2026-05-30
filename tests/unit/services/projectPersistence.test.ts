import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLastActiveProjectFile,
  clearLastTauriProjectPath,
  loadLastActiveProjectFile,
  loadLastBrowserDirectoryHandle,
  loadRecentProjects,
  removeRecentProject,
  loadLastTauriProjectPath,
  saveLastActiveProjectFile,
  saveLastBrowserDirectoryHandle,
  saveLastTauriProjectPath,
  saveRecentProject,
} from "../../../src/services/projectPersistence";

type FakeRequest<T = unknown> = {
  error: Error | null;
  result?: T;
  onerror: (() => void) | null;
  onsuccess: (() => void) | null;
  onupgradeneeded?: (() => void) | null;
};

function createIndexedDbHarness(options?: {
  openError?: Error;
  readError?: Error;
  writeError?: Error;
  hasStore?: boolean;
}) {
  const store = new Map<string, unknown>();
  const db = {
    objectStoreNames: {
      contains: vi.fn(() => options?.hasStore ?? true),
    },
    createObjectStore: vi.fn(),
    close: vi.fn(),
    transaction: vi.fn((storeName: string, mode: IDBTransactionMode) => {
      void storeName;
      const transaction = {
        error: options?.writeError ?? options?.readError ?? null,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        objectStore: vi.fn(() => ({
          get: (key: string) => {
            const request: FakeRequest = {
              error: options?.readError ?? null,
              result: store.get(key),
              onerror: null,
              onsuccess: null,
            };

            queueMicrotask(() => {
              if (options?.readError) {
                request.onerror?.();
              } else {
                request.onsuccess?.();
              }
            });

            return request;
          },
          put: (value: unknown, key: string) => {
            const request: FakeRequest = {
              error: options?.writeError ?? null,
              onerror: null,
              onsuccess: null,
            };

            queueMicrotask(() => {
              if (options?.writeError) {
                transaction.onerror?.();
                return;
              }

              store.set(key, value);
              request.onsuccess?.();
              transaction.oncomplete?.();
            });

            return request;
          },
        })),
      };

      if (options?.readError && mode === "readonly") {
        queueMicrotask(() => {
          transaction.onerror?.();
        });
      }

      return transaction;
    }),
  };

  const indexedDb = {
    open: vi.fn(() => {
      const request: FakeRequest<typeof db> = {
        error: options?.openError ?? null,
        result: db,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
      };

      queueMicrotask(() => {
        if (options?.openError) {
          request.onerror?.();
          return;
        }

        request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    }),
  };

  return { db, indexedDb, store };
}

describe("projectPersistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores, loads, and clears the last Tauri project path", () => {
    saveLastTauriProjectPath("/notes/book");

    expect(loadLastTauriProjectPath()).toBe("/notes/book");

    clearLastTauriProjectPath();

    expect(loadLastTauriProjectPath()).toBeNull();
  });

  it("stores last active files independently per project id", () => {
    saveLastActiveProjectFile("tauri:/notes/book", "chapter-01.md");
    saveLastActiveProjectFile("browser:book-1", "notes/idea.md");

    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBe("chapter-01.md");
    expect(loadLastActiveProjectFile("browser:book-1")).toBe("notes/idea.md");

    clearLastActiveProjectFile("tauri:/notes/book");

    expect(loadLastActiveProjectFile("tauri:/notes/book")).toBeNull();
    expect(loadLastActiveProjectFile("browser:book-1")).toBe("notes/idea.md");
  });

  it("stores recent projects with newest first and removes missing entries", () => {
    saveRecentProject({ kind: "tauri", id: "/one", label: "/one" });
    saveRecentProject({ kind: "browser", id: "book-1", label: "Book (browser)" });
    saveRecentProject({ kind: "tauri", id: "/one", label: "/one renamed" });

    expect(loadRecentProjects()).toEqual([
      { kind: "tauri", id: "/one", label: "/one renamed" },
      { kind: "browser", id: "book-1", label: "Book (browser)" },
    ]);

    expect(removeRecentProject("/one")).toEqual([
      { kind: "browser", id: "book-1", label: "Book (browser)" },
    ]);
  });

  it("ignores invalid recent project storage", () => {
    window.localStorage.setItem("mdtor:recent-projects", "{");

    expect(loadRecentProjects()).toEqual([]);

    window.localStorage.setItem(
      "mdtor:recent-projects",
      JSON.stringify([{ kind: "bad", id: 1, label: null }]),
    );

    expect(loadRecentProjects()).toEqual([]);
  });

  it("stores and restores browser directory handles from IndexedDB", async () => {
    const { db, indexedDb } = createIndexedDbHarness();
    const directoryHandle = {
      name: "Book",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    } as unknown as FileSystemDirectoryHandle;
    vi.stubGlobal("indexedDB", indexedDb);

    await saveLastBrowserDirectoryHandle(directoryHandle, "book-1");

    await expect(loadLastBrowserDirectoryHandle()).resolves.toEqual({
      id: "book-1",
      directoryHandle,
    });
    expect(indexedDb.open).toHaveBeenCalledWith("mdtor-project-state", 1);
    expect(db.transaction).toHaveBeenCalledWith("project-handles", "readwrite");
    expect(db.transaction).toHaveBeenCalledWith("project-handles", "readonly");
    expect(directoryHandle.requestPermission).toHaveBeenCalledWith({
      mode: "readwrite",
    });
  });

  it("creates the IndexedDB store during schema upgrades", async () => {
    const { db, indexedDb } = createIndexedDbHarness({
      hasStore: false,
    });
    const directoryHandle = {
      name: "Book",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    } as unknown as FileSystemDirectoryHandle;
    vi.stubGlobal("indexedDB", indexedDb);

    await saveLastBrowserDirectoryHandle(directoryHandle, "book-1");

    expect(db.createObjectStore).toHaveBeenCalledWith("project-handles");
  });

  it("returns null when the browser directory handle is missing", async () => {
    const { indexedDb } = createIndexedDbHarness();
    vi.stubGlobal("indexedDB", indexedDb);

    await expect(loadLastBrowserDirectoryHandle()).resolves.toBeNull();
  });

  it("loads legacy browser directory handle records", async () => {
    const { indexedDb, store } = createIndexedDbHarness();
    const directoryHandle = {
      name: "Legacy Book",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    } as unknown as FileSystemDirectoryHandle;
    store.set("last-browser-directory", directoryHandle);
    vi.stubGlobal("indexedDB", indexedDb);

    await expect(loadLastBrowserDirectoryHandle()).resolves.toEqual({
      id: "Legacy Book",
      directoryHandle,
    });
  });

  it("returns null when browser directory persistence is unavailable or denied", async () => {
    vi.stubGlobal("indexedDB", undefined);

    await expect(loadLastBrowserDirectoryHandle()).resolves.toBeNull();
    await expect(
      saveLastBrowserDirectoryHandle({} as FileSystemDirectoryHandle, "book-1"),
    ).resolves.toBeUndefined();

    const { indexedDb } = createIndexedDbHarness();
    const directoryHandle = {
      name: "Denied",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    } as unknown as FileSystemDirectoryHandle;
    vi.stubGlobal("indexedDB", indexedDb);

    await saveLastBrowserDirectoryHandle(directoryHandle, "denied-1");

    await expect(loadLastBrowserDirectoryHandle()).resolves.toBeNull();
  });

  it("bubbles IndexedDB open failures while saving browser handles", async () => {
    const { indexedDb } = createIndexedDbHarness({
      openError: new Error("open failed"),
    });
    vi.stubGlobal("indexedDB", indexedDb);

    await expect(
      saveLastBrowserDirectoryHandle({} as FileSystemDirectoryHandle, "book-1"),
    ).rejects.toThrow("open failed");
  });

  it("bubbles IndexedDB transaction failures while saving browser handles", async () => {
    const { indexedDb } = createIndexedDbHarness({
      writeError: new Error("write failed"),
    });
    vi.stubGlobal("indexedDB", indexedDb);

    await expect(
      saveLastBrowserDirectoryHandle({} as FileSystemDirectoryHandle, "book-1"),
    ).rejects.toThrow("write failed");
  });

  it("bubbles IndexedDB transaction failures while loading browser handles", async () => {
    const { indexedDb } = createIndexedDbHarness({
      readError: new Error("read failed"),
    });
    vi.stubGlobal("indexedDB", indexedDb);

    await expect(loadLastBrowserDirectoryHandle()).rejects.toThrow("read failed");
  });
});
