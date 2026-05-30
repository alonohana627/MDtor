import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { useProjectWorkspaceActions } from "../../src/hooks/useProjectWorkspaceActions";
import type { ProjectSource } from "../../src/project/projectTypes";
import type { ProjectFile } from "../../src/services/projectFiles";
import type { BrowserProjectFile } from "../../src/services/browserProjectFiles";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
}));

vi.mock("../../src/services/browserProjectFiles", () => ({
  isBrowserProjectFolderPickerSupported: vi.fn(() => false),
  scanBrowserProjectFolder: vi.fn(async () => ({
    files: [],
    fileHandles: new Map(),
  })),
}));

vi.mock("../../src/hooks/useProjectWorkspaceHelpers", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/hooks/useProjectWorkspaceHelpers")
  >("../../src/hooks/useProjectWorkspaceHelpers");

  return {
    ...actual,
    applyActiveFileFallback: vi.fn(async () => undefined),
    createWorkspaceFile: vi.fn(async ({ refs }) => refs.projectFiles),
    deleteWorkspaceFile: vi.fn(async ({ refs }) => refs.projectFiles),
    openWorkspaceFolder: vi.fn(async () => undefined),
    openRecentWorkspaceProject: vi.fn(async () => undefined),
    renameWorkspaceFile: vi.fn(async ({ refs }) => refs.projectFiles),
    saveWorkspaceDocument: vi.fn(async () => true),
    switchWorkspaceFile: vi.fn(async () => undefined),
  };
});

type ActionsResult = ReturnType<typeof useProjectWorkspaceActions>;

function makeProjectFiles(count: number): ProjectFile[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `file-${index}.md`,
    relativePath: `docs/file-${index}.md`,
    path: `/project/docs/file-${index}.md`,
  }));
}

const projectFiles = makeProjectFiles(1000);

const browserProjectSource: ProjectSource = {
  kind: "browser",
  directoryHandle: {} as FileSystemDirectoryHandle,
  name: "project",
};

function ActionsHarness({
  actionRef,
  projectSource = browserProjectSource,
  isDirty = false,
}: {
  actionRef: { current: ActionsResult | null };
  projectSource?: ProjectSource | null;
  isDirty?: boolean;
}) {
  actionRef.current = useProjectWorkspaceActions({
    markdown: "# Current document",
    projectSource,
    isDirty,
    activeFilePathRef: { current: "docs/file-0.md" },
    browserDirectoryHandleRef: {
      current: {} as FileSystemDirectoryHandle,
    },
    browserFileHandlesRef: {
      current: new Map<string, BrowserProjectFile>(),
    },
    projectFilesRef: {
      current: projectFiles,
    },
    focusEditor: vi.fn(),
    setActiveFile: vi.fn(),
    setCurrentLine: vi.fn(),
    setIsBusy: vi.fn(),
    setMarkdown: vi.fn(),
    setProjectError: vi.fn(),
    setProjectFiles: vi.fn(),
    setProjectSource: vi.fn(),
    setSavedMarkdown: vi.fn(),
    setRecentProjects: vi.fn(),
  });

  return null;
}

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderActionsHook(
  projectSource: ProjectSource | null = browserProjectSource,
  isDirty = false,
) {
  const actionRef: { current: ActionsResult | null } = { current: null };

  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <ActionsHarness
        actionRef={actionRef}
        projectSource={projectSource}
        isDirty={isDirty}
      />,
    );
  });

  if (!actionRef.current) {
    throw new Error("useProjectWorkspaceActions did not initialize.");
  }

  return actionRef.current;
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
  vi.restoreAllMocks();
});

describe("useProjectWorkspaceActions setup", () => {
  bench("mount actions hook with browser project", () => {
    renderActionsHook(browserProjectSource);
  });

  bench("mount actions hook without project", () => {
    renderActionsHook(null);
  });

  bench("mount actions hook with dirty document", () => {
    renderActionsHook(browserProjectSource, true);
  });
});

describe("useProjectWorkspaceActions callbacks", () => {
  bench("save active document", async () => {
    const actions = renderActionsHook(browserProjectSource);
    await actions.saveActiveDocument();
  });

  bench("handle manual save", async () => {
    const actions = renderActionsHook(browserProjectSource);
    await actions.handleManualSave();
  });

  bench("scan browser folder for changes", async () => {
    const actions = renderActionsHook(browserProjectSource);
    await actions.scanBrowserFolderForChanges();
  });

  bench("handle missing active file", async () => {
    const actions = renderActionsHook(browserProjectSource);
    await actions.handleMissingActiveFile(projectFiles);
  });

  bench("move project file down", () => {
    const actions = renderActionsHook(browserProjectSource);
    actions.moveProjectFile("docs/file-10.md", "down");
  });

  bench("switch to next file", () => {
    const actions = renderActionsHook(browserProjectSource);
    actions.switchToNextFile();
  });
});
