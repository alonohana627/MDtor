import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { ProjectSidebar } from "../../src/components/ProjectSidebar";
import type { ProjectFile } from "../../src/services/projectFiles";
import type { RecentProject } from "../../src/services/projectPersistence";

function makeProjectFiles(count: number): ProjectFile[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `file-${index}.md`,
    relativePath: `docs/file-${index}.md`,
    path: `/project/docs/file-${index}.md`,
  }));
}

function makeRecentProjects(count: number): RecentProject[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: "tauri",
    id: `/project-${index}`,
    label: `Project ${index}`,
    path: `/project-${index}`,
  }));
}

const emptyFiles: ProjectFile[] = [];
const smallFiles = makeProjectFiles(10);
const mediumFiles = makeProjectFiles(250);
const largeFiles = makeProjectFiles(1000);
const recentProjects = makeRecentProjects(10);

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderProjectSidebar(files: ProjectFile[]) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(
      <ProjectSidebar
        files={files}
        activeFilePath={files[0]?.relativePath ?? null}
        isDirty={true}
        projectPath="/project"
        recentProjects={recentProjects}
        isBusy={false}
        error={null}
        onOpenProject={vi.fn()}
        onOpenRecentProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={vi.fn()}
        onRenameFile={vi.fn()}
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
});

describe("ProjectSidebar render", () => {
  bench("render empty project sidebar", () => {
    renderProjectSidebar(emptyFiles);
  });

  bench("render small project sidebar", () => {
    renderProjectSidebar(smallFiles);
  });

  bench("render medium project sidebar", () => {
    renderProjectSidebar(mediumFiles);
  });

  bench("render large project sidebar", () => {
    renderProjectSidebar(largeFiles);
  });
});
