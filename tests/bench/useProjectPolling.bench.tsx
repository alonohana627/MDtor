import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { useProjectPolling } from "../../src/hooks/useProjectPolling";
import type { ProjectSource } from "../../src/project/projectTypes";
import type { ProjectFile } from "../../src/services/projectFiles";

vi.mock("../../src/services/projectFiles", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/projectFiles")>(
    "../../src/services/projectFiles",
  );

  return {
    ...actual,
    scanProjectFolder: vi.fn(async () => []),
  };
});

function makeProjectFiles(count: number): ProjectFile[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `file-${index}.md`,
    relativePath: `docs/file-${index}.md`,
    path: `/project/docs/file-${index}.md`,
  }));
}

const emptyFiles: ProjectFile[] = [];
const smallFiles = makeProjectFiles(10);
const mediumFiles = makeProjectFiles(250);
const largeFiles = makeProjectFiles(1000);

const tauriProjectSource: ProjectSource = {
  kind: "tauri",
  path: "/project",
};

const browserProjectSource: ProjectSource = {
  kind: "browser",
  directoryHandle: {} as FileSystemDirectoryHandle,
  name: "project",
};

// eslint-disable-next-line react-refresh/only-export-components
function PollingHarness({
  projectSource,
  currentFiles,
  scannedFiles,
  activeFilePath = "docs/file-0.md",
}: {
  projectSource: ProjectSource | null;
  currentFiles: ProjectFile[];
  scannedFiles: ProjectFile[];
  activeFilePath?: string | null;
}) {
  useProjectPolling({
    activeFilePathRef: { current: activeFilePath },
    isPollingProjectRef: { current: false },
    projectFilesRef: { current: currentFiles },
    projectSource,
    scanBrowserFolderForChanges: vi.fn(async () => scannedFiles),
    handleMissingActiveFile: vi.fn(async () => undefined),
    setProjectError: vi.fn(),
    setProjectFiles: vi.fn(),
  });

  return null;
}

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderPollingHook(
  projectSource: ProjectSource | null,
  currentFiles: ProjectFile[],
  scannedFiles: ProjectFile[],
  activeFilePath?: string | null,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <PollingHarness
        projectSource={projectSource}
        currentFiles={currentFiles}
        scannedFiles={scannedFiles}
        activeFilePath={activeFilePath}
      />,
    );
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

describe("useProjectPolling setup", () => {
  bench("mount polling hook without project", () => {
    renderPollingHook(null, emptyFiles, emptyFiles);
  });

  bench("mount polling hook with tauri project", () => {
    renderPollingHook(tauriProjectSource, smallFiles, smallFiles);
  });

  bench("mount polling hook with browser project", () => {
    renderPollingHook(browserProjectSource, smallFiles, smallFiles);
  });
});

describe("useProjectPolling setup with file refs", () => {
  bench("mount polling hook with small file list", () => {
    renderPollingHook(browserProjectSource, smallFiles, smallFiles);
  });

  bench("mount polling hook with medium file list", () => {
    renderPollingHook(browserProjectSource, mediumFiles, mediumFiles);
  });

  bench("mount polling hook with large file list", () => {
    renderPollingHook(browserProjectSource, largeFiles, largeFiles);
  });
});
