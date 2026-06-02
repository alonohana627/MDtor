import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { useProjectWorkspace } from "../../src/hooks/useProjectWorkspace";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
}));

vi.mock("../../src/services/projectPersistence", () => ({
  loadRecentProjects: vi.fn(() => []),
}));

vi.mock("../../src/services/browserProjectFiles", () => ({
  isBrowserProjectFolderPickerSupported: vi.fn(() => false),
  readBrowserProjectAsset: vi.fn(),
}));

vi.mock("../../src/services/projectFiles", () => ({
  readProjectAsset: vi.fn(),
  scanProjectFolder: vi.fn(async () => []),
}));

vi.mock("../../src/hooks/useProjectPolling", () => ({
  useProjectPolling: vi.fn(),
}));

vi.mock("../../src/hooks/useProjectKeyboardShortcuts", () => ({
  useProjectKeyboardShortcuts: vi.fn(),
}));

vi.mock("../../src/hooks/useProjectWorkspaceActions", () => ({
  useProjectWorkspaceActions: vi.fn(() => ({
    createNewFile: vi.fn(),
    createNewFolder: vi.fn(),
    deleteFile: vi.fn(),
    deleteFolder: vi.fn(),
    handleManualSave: vi.fn(),
    handleMissingActiveFile: vi.fn(),
    moveProjectFile: vi.fn(),
    openProjectFolder: vi.fn(),
    openQuickFileSwitcher: vi.fn(),
    openRecentProject: vi.fn(),
    refreshProject: vi.fn(),
    renameFile: vi.fn(),
    renameFolder: vi.fn(),
    revealFile: vi.fn(),
    scanBrowserFolderForChanges: vi.fn(async () => []),
    switchFile: vi.fn(),
    switchToNextFile: vi.fn(),
  })),
}));

vi.mock("../../src/hooks/useProjectWorkspaceHelpers", () => ({
  handleRestoreWorkspaceError: vi.fn(),
  restoreWorkspaceProject: vi.fn(async () => undefined),
}));

// eslint-disable-next-line react-refresh/only-export-components
function ProjectWorkspaceHarness() {
  useProjectWorkspace();

  return null;
}

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderProjectWorkspaceHook() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(<ProjectWorkspaceHarness />);
  });
}

afterEach(() => {
  for (const root of roots) {
    root.unmount();
  }

  for (const container of containers) {
    container.remove();
  }

  roots = [];
  containers = [];
  vi.clearAllMocks();
});

describe("useProjectWorkspace setup", () => {
  bench("mount project workspace hook", () => {
    renderProjectWorkspaceHook();
  });
});
