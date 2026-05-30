import { bench, describe, vi } from "vitest";
import type { ProjectFile } from "../../src/services/projectFiles";
import type { BrowserProjectFile } from "../../src/services/browserProjectFiles";
import type {
  WorkspaceEffects,
  WorkspaceRefs,
  WorkspaceState,
} from "../../src/hooks/workspaceTypes";
import {
  handleRestoreWorkspaceError,
  openRecentWorkspaceProject,
  openWorkspaceFolder,
  restoreWorkspaceProject,
} from "../../src/hooks/workspaceProjectLifecycle";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "/project"),
}));

vi.mock("../../src/services/projectFiles", () => ({
  scanProjectFolder: vi.fn(async () => makeProjectFiles(1000)),
}));

vi.mock("../../src/services/browserProjectFiles", () => ({
  openBrowserProjectFolder: vi.fn(async () => ({
    id: "browser-project-id",
    name: "browser-project",
    directoryHandle: { name: "browser-project" },
    files: makeProjectFiles(1000),
    fileHandles: new Map<string, BrowserProjectFile>(),
  })),
  scanBrowserProjectFolder: vi.fn(async () => ({
    files: makeProjectFiles(1000),
    fileHandles: new Map<string, BrowserProjectFile>(),
  })),
}));

vi.mock("../../src/services/projectPersistence", () => ({
  clearLastTauriProjectPath: vi.fn(),
  loadLastBrowserDirectoryHandle: vi.fn(async () => ({
    id: "browser-project-id",
    directoryHandle: { name: "browser-project" },
  })),
  loadLastTauriProjectPath: vi.fn(() => "/project"),
  removeRecentProject: vi.fn(() => []),
  saveLastBrowserDirectoryHandle: vi.fn(async () => undefined),
  saveLastTauriProjectPath: vi.fn(),
  saveRecentProject: vi.fn(() => []),
}));

vi.mock("../../src/hooks/workspaceCore", async () => {
  const actual = await vi.importActual<typeof import("../../src/hooks/workspaceCore")>(
    "../../src/hooks/workspaceCore",
  );

  return {
    ...actual,
    loadProjectState: vi.fn(async () => undefined),
  };
});

function makeProjectFiles(count: number): ProjectFile[] {
  return Array.from({ length: count }, (_, index) => ({
    relativePath: `docs/file-${index}.md`,
  }));
}

function makeRefs(): WorkspaceRefs {
  return {
    activeFilePath: "docs/file-0.md",
    browserDirectoryHandle: null,
    browserFileHandles: new Map<string, BrowserProjectFile>(),
    projectFiles: makeProjectFiles(1000),
    source: {
      kind: "tauri",
      path: "/project",
    },
  };
}

function makeState(): WorkspaceState {
  return {
    setActiveFile: vi.fn(),
    setCurrentLine: vi.fn(),
    setMarkdown: vi.fn(),
    setProjectFiles: vi.fn(),
    setProjectSource: vi.fn(),
    setSavedMarkdown: vi.fn(),
  };
}

function makeEffects(): WorkspaceEffects {
  return {
    focusEditor: vi.fn(),
    setBrowserDirectoryHandle: vi.fn(),
    setBrowserFileHandles: vi.fn(),
    setProjectError: vi.fn(),
    setRecentProjects: vi.fn(),
  };
}

describe("openWorkspaceFolder", () => {
  bench("open tauri workspace folder", async () => {
    await openWorkspaceFolder({
      isTauriRuntime: true,
      isBrowserFolderPickerSupported: false,
      saveActiveDocument: vi.fn(async () => undefined),
      refs: makeRefs(),
      state: makeState(),
      effects: makeEffects(),
    });
  });

  bench("open browser workspace folder", async () => {
    await openWorkspaceFolder({
      isTauriRuntime: false,
      isBrowserFolderPickerSupported: true,
      saveActiveDocument: vi.fn(async () => undefined),
      refs: makeRefs(),
      state: makeState(),
      effects: makeEffects(),
    });
  });

  bench("reject unsupported browser folder picker", async () => {
    await openWorkspaceFolder({
      isTauriRuntime: false,
      isBrowserFolderPickerSupported: false,
      saveActiveDocument: vi.fn(async () => undefined),
      refs: makeRefs(),
      state: makeState(),
      effects: makeEffects(),
    });
  });
});

describe("openRecentWorkspaceProject", () => {
  bench("open recent tauri project", async () => {
    await openRecentWorkspaceProject({
      recentProject: {
        kind: "tauri",
        id: "/project",
        label: "/project",
      },
      refs: makeRefs(),
      state: makeState(),
      effects: makeEffects(),
    });
  });

  bench("open recent browser project", async () => {
    await openRecentWorkspaceProject({
      recentProject: {
        kind: "browser",
        id: "browser-project-id",
        label: "browser-project",
      },
      refs: makeRefs(),
      state: makeState(),
      effects: makeEffects(),
    });
  });
});

describe("restoreWorkspaceProject", () => {
  bench("restore tauri workspace project", async () => {
    await restoreWorkspaceProject({
      isTauriRuntime: true,
      isBrowserFolderPickerSupported: false,
      isCancelled: () => false,
      refs: {
        browserFileHandles: new Map<string, BrowserProjectFile>(),
      },
      state: makeState(),
      effects: makeEffects(),
    });
  });

  bench("restore browser workspace project", async () => {
    await restoreWorkspaceProject({
      isTauriRuntime: false,
      isBrowserFolderPickerSupported: true,
      isCancelled: () => false,
      refs: {
        browserFileHandles: new Map<string, BrowserProjectFile>(),
      },
      state: makeState(),
      effects: makeEffects(),
    });
  });

  bench("skip cancelled restore", async () => {
    await restoreWorkspaceProject({
      isTauriRuntime: true,
      isBrowserFolderPickerSupported: false,
      isCancelled: () => true,
      refs: {
        browserFileHandles: new Map<string, BrowserProjectFile>(),
      },
      state: makeState(),
      effects: makeEffects(),
    });
  });
});

describe("handleRestoreWorkspaceError", () => {
  bench("handle tauri restore error", () => {
    handleRestoreWorkspaceError(new Error("broken"), true, false, vi.fn());
  });

  bench("handle browser restore error", () => {
    handleRestoreWorkspaceError(new Error("broken"), false, false, vi.fn());
  });

  bench("ignore cancelled restore error", () => {
    handleRestoreWorkspaceError(new Error("broken"), true, true, vi.fn());
  });
});
