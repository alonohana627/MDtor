import { bench, describe, vi } from "vitest";
import type { ProjectSource } from "../../src/project/projectTypes";
import type { ProjectFile } from "../../src/services/projectFiles";
import type { BrowserProjectFile } from "../../src/services/browserProjectFiles";
import type { WorkspaceState } from "../../src/hooks/workspaceTypes";
import {
  getInitialProjectFile,
  loadProjectState,
  readWorkspaceDocument,
  rememberActiveProjectFile,
  saveWorkspaceDocument,
  toProjectErrorMessage,
} from "../../src/hooks/workspaceCore";

vi.mock("../../src/services/projectPersistence", () => ({
  clearLastActiveProjectFile: vi.fn(),
  loadLastActiveProjectFile: vi.fn(() => "docs/file-500.md"),
  saveLastActiveProjectFile: vi.fn(),
}));

vi.mock("../../src/services/projectFiles", () => ({
  readProjectFile: vi.fn(async () => "# Tauri document"),
  saveProjectFile: vi.fn(async () => undefined),
}));

vi.mock("../../src/services/browserProjectFiles", () => ({
  readBrowserProjectFile: vi.fn(async () => "# Browser document"),
  saveBrowserProjectFile: vi.fn(async () => undefined),
}));

function makeProjectFiles(count: number): ProjectFile[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `file-${index}.md`,
    relativePath: `docs/file-${index}.md`,
    path: `/project/docs/file-${index}.md`,
  }));
}

function makeWorkspaceState(): WorkspaceState {
  return {
    setProjectSource: vi.fn(),
    setProjectFiles: vi.fn(),
    setActiveFile: vi.fn(),
    setMarkdown: vi.fn(),
    setSavedMarkdown: vi.fn(),
    setCurrentLine: vi.fn(),
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

const browserFileHandles = new Map<string, BrowserProjectFile>();

describe("workspaceCore error handling", () => {
  bench("convert Error to project error message", () => {
    toProjectErrorMessage(new Error("broken"));
  });

  bench("convert string to project error message", () => {
    toProjectErrorMessage("broken");
  });
});

describe("rememberActiveProjectFile", () => {
  bench("remember active tauri project file", () => {
    rememberActiveProjectFile(tauriSource, "docs/file-1.md");
  });

  bench("clear active tauri project file", () => {
    rememberActiveProjectFile(tauriSource, null);
  });

  bench("remember active browser project file", () => {
    rememberActiveProjectFile(browserSource, "docs/file-1.md");
  });
});

describe("getInitialProjectFile", () => {
  bench("find initial file in small project", () => {
    getInitialProjectFile(tauriSource, smallFiles);
  });

  bench("find initial file in medium project", () => {
    getInitialProjectFile(tauriSource, mediumFiles);
  });

  bench("find initial file in large project", () => {
    getInitialProjectFile(tauriSource, largeFiles);
  });
});

describe("readWorkspaceDocument", () => {
  bench("read tauri workspace document", async () => {
    await readWorkspaceDocument(tauriSource, browserFileHandles, "docs/file-1.md");
  });

  bench("read browser workspace document", async () => {
    await readWorkspaceDocument(browserSource, browserFileHandles, "docs/file-1.md");
  });
});

describe("saveWorkspaceDocument", () => {
  bench("save missing source", async () => {
    await saveWorkspaceDocument({
      source: null,
      browserFileHandles,
      activeFilePath: "docs/file-1.md",
      content: "# Document",
    });
  });

  bench("save missing active file", async () => {
    await saveWorkspaceDocument({
      source: tauriSource,
      browserFileHandles,
      activeFilePath: null,
      content: "# Document",
    });
  });

  bench("save tauri workspace document", async () => {
    await saveWorkspaceDocument({
      source: tauriSource,
      browserFileHandles,
      activeFilePath: "docs/file-1.md",
      content: "# Document",
    });
  });

  bench("save browser workspace document", async () => {
    await saveWorkspaceDocument({
      source: browserSource,
      browserFileHandles,
      activeFilePath: "docs/file-1.md",
      content: "# Document",
    });
  });
});

describe("loadProjectState", () => {
  bench("load small tauri project state", async () => {
    await loadProjectState({
      source: tauriSource,
      files: smallFiles,
      refs: { browserFileHandles },
      state: makeWorkspaceState(),
      focusEditor: vi.fn(),
    });
  });

  bench("load medium tauri project state", async () => {
    await loadProjectState({
      source: tauriSource,
      files: mediumFiles,
      refs: { browserFileHandles },
      state: makeWorkspaceState(),
      focusEditor: vi.fn(),
    });
  });

  bench("load large tauri project state", async () => {
    await loadProjectState({
      source: tauriSource,
      files: largeFiles,
      refs: { browserFileHandles },
      state: makeWorkspaceState(),
      focusEditor: vi.fn(),
    });
  });

  bench("skip apply after cancelled load", async () => {
    await loadProjectState({
      source: tauriSource,
      files: largeFiles,
      refs: { browserFileHandles },
      state: makeWorkspaceState(),
      focusEditor: vi.fn(),
      shouldApply: () => false,
    });
  });
});
