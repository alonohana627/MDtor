import { bench, describe, vi } from "vitest";
import type { ProjectSource } from "../../src/project/projectTypes";
import type { BrowserProjectFile } from "../../src/services/browserProjectFiles";
import type { ProjectFile } from "../../src/services/projectFiles";
import type { WorkspaceRefs, WorkspaceState } from "../../src/hooks/workspaceTypes";
import {
  applyActiveFileFallback,
  createWorkspaceFile,
  deleteWorkspaceFile,
  findQuickSwitchFile,
  getNextProjectFilePath,
  removeProjectFile,
  renameWorkspaceFile,
  reorderProjectFiles,
  switchWorkspaceFile,
} from "../../src/hooks/workspaceFileOperations";

vi.mock("../../src/hooks/workspaceCore", () => ({
  readWorkspaceDocument: vi.fn(async () => "# Loaded document"),
  rememberActiveProjectFile: vi.fn(),
}));

vi.mock("../../src/services/projectFiles", () => ({
  createProjectFile: vi.fn(async () => undefined),
  deleteProjectFile: vi.fn(async () => undefined),
  renameProjectFile: vi.fn(async () => undefined),
}));

vi.mock("../../src/services/browserProjectFiles", () => ({
  createBrowserProjectFile: vi.fn(async () => undefined),
  deleteBrowserProjectFile: vi.fn(async () => undefined),
  renameBrowserProjectFile: vi.fn(async () => undefined),
}));

function makeProjectFiles(count: number): ProjectFile[] {
  return Array.from({ length: count }, (_, index) => ({
    relativePath: `docs/file-${index}.md`,
  }));
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

function makeRefs(files: ProjectFile[], source: ProjectSource): WorkspaceRefs {
  return {
    activeFilePath: "docs/file-500.md",
    browserDirectoryHandle: {} as FileSystemDirectoryHandle,
    browserFileHandles: new Map<string, BrowserProjectFile>(),
    projectFiles: files,
    source,
  };
}

const smallFiles = makeProjectFiles(10);
const mediumFiles = makeProjectFiles(250);
const largeFiles = makeProjectFiles(1000);

const tauriSource: ProjectSource = {
  kind: "tauri",
  path: "/project",
};

const browserSource: ProjectSource = {
  kind: "browser",
  id: "project-id",
  name: "project",
};

describe("reorderProjectFiles", () => {
  bench("move item down in small project", () => {
    reorderProjectFiles(smallFiles, "docs/file-5.md", "down");
  });

  bench("move item down in medium project", () => {
    reorderProjectFiles(mediumFiles, "docs/file-125.md", "down");
  });

  bench("move item down in large project", () => {
    reorderProjectFiles(largeFiles, "docs/file-500.md", "down");
  });

  bench("move missing item", () => {
    reorderProjectFiles(largeFiles, "docs/missing.md", "down");
  });
});

describe("findQuickSwitchFile", () => {
  bench("exact match in large project", () => {
    findQuickSwitchFile(largeFiles, "docs/file-500.md");
  });

  bench("partial match in large project", () => {
    findQuickSwitchFile(largeFiles, "file-500");
  });

  bench("missing query in large project", () => {
    findQuickSwitchFile(largeFiles, "does-not-exist");
  });

  bench("empty query in large project", () => {
    findQuickSwitchFile(largeFiles, "   ");
  });
});

describe("getNextProjectFilePath", () => {
  bench("next file in small project", () => {
    getNextProjectFilePath(smallFiles, "docs/file-5.md");
  });

  bench("next file in medium project", () => {
    getNextProjectFilePath(mediumFiles, "docs/file-125.md");
  });

  bench("next file in large project", () => {
    getNextProjectFilePath(largeFiles, "docs/file-500.md");
  });

  bench("next file when active file missing", () => {
    getNextProjectFilePath(largeFiles, "docs/missing.md");
  });
});

describe("removeProjectFile", () => {
  bench("remove item from small project", () => {
    removeProjectFile(smallFiles, "docs/file-5.md");
  });

  bench("remove item from medium project", () => {
    removeProjectFile(mediumFiles, "docs/file-125.md");
  });

  bench("remove item from large project", () => {
    removeProjectFile(largeFiles, "docs/file-500.md");
  });

  bench("remove missing item from large project", () => {
    removeProjectFile(largeFiles, "docs/missing.md");
  });
});

describe("switchWorkspaceFile", () => {
  bench("switch clean tauri file", async () => {
    await switchWorkspaceFile({
      relativePath: "docs/file-501.md",
      isDirty: false,
      refs: makeRefs(largeFiles, tauriSource),
      state: makeState(),
      focusEditor: vi.fn(),
      saveActiveDocument: vi.fn(async () => undefined),
    });
  });

  bench("switch dirty tauri file", async () => {
    await switchWorkspaceFile({
      relativePath: "docs/file-501.md",
      isDirty: true,
      refs: makeRefs(largeFiles, tauriSource),
      state: makeState(),
      focusEditor: vi.fn(),
      saveActiveDocument: vi.fn(async () => undefined),
    });
  });

  bench("switch to same file", async () => {
    await switchWorkspaceFile({
      relativePath: "docs/file-500.md",
      isDirty: true,
      refs: makeRefs(largeFiles, tauriSource),
      state: makeState(),
      focusEditor: vi.fn(),
      saveActiveDocument: vi.fn(async () => undefined),
    });
  });
});

describe("createWorkspaceFile", () => {
  bench("create tauri file in large project", async () => {
    await createWorkspaceFile({
      source: tauriSource,
      relativePath: "docs/new-file.md",
      isDirty: false,
      refs: makeRefs(largeFiles, tauriSource),
      state: makeState(),
      focusEditor: vi.fn(),
      saveActiveDocument: vi.fn(async () => undefined),
    });
  });

  bench("create browser file in large project", async () => {
    await createWorkspaceFile({
      source: browserSource,
      relativePath: "docs/new-file.md",
      isDirty: false,
      refs: makeRefs(largeFiles, browserSource),
      state: makeState(),
      focusEditor: vi.fn(),
      saveActiveDocument: vi.fn(async () => undefined),
    });
  });
});

describe("applyActiveFileFallback", () => {
  bench("apply fallback with files", async () => {
    await applyActiveFileFallback({
      files: largeFiles,
      refs: {
        browserFileHandles: new Map<string, BrowserProjectFile>(),
      },
      source: tauriSource,
      state: makeState(),
      focusEditor: vi.fn(),
    });
  });

  bench("apply fallback with empty files", async () => {
    await applyActiveFileFallback({
      files: [],
      refs: {
        browserFileHandles: new Map<string, BrowserProjectFile>(),
      },
      source: tauriSource,
      state: makeState(),
      focusEditor: vi.fn(),
    });
  });
});

describe("deleteWorkspaceFile", () => {
  bench("delete inactive tauri file", async () => {
    await deleteWorkspaceFile({
      relativePath: "docs/file-100.md",
      refs: makeRefs(largeFiles, tauriSource),
      source: tauriSource,
      state: makeState(),
      focusEditor: vi.fn(),
    });
  });

  bench("delete active tauri file", async () => {
    await deleteWorkspaceFile({
      relativePath: "docs/file-500.md",
      refs: makeRefs(largeFiles, tauriSource),
      source: tauriSource,
      state: makeState(),
      focusEditor: vi.fn(),
    });
  });
});

describe("renameWorkspaceFile", () => {
  bench("rename inactive tauri file", async () => {
    await renameWorkspaceFile({
      oldRelativePath: "docs/file-100.md",
      newRelativePath: "docs/renamed.md",
      refs: makeRefs(largeFiles, tauriSource),
      source: tauriSource,
      state: makeState(),
    });
  });

  bench("rename active tauri file", async () => {
    await renameWorkspaceFile({
      oldRelativePath: "docs/file-500.md",
      newRelativePath: "docs/renamed.md",
      refs: makeRefs(largeFiles, tauriSource),
      source: tauriSource,
      state: makeState(),
    });
  });

  bench("rename to same path", async () => {
    await renameWorkspaceFile({
      oldRelativePath: "docs/file-500.md",
      newRelativePath: "docs/file-500.md",
      refs: makeRefs(largeFiles, tauriSource),
      source: tauriSource,
      state: makeState(),
    });
  });
});
