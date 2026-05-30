import { type MouseEvent, useEffect, useState } from "react";
import { type ProjectFile } from "../../services/projectFiles";
import { type RecentProject } from "../../services/projectPersistence";
import "./ProjectSidebar.css";

type FileContextMenu = {
  relativePath: string;
  x: number;
  y: number;
};

type ProjectSidebarProps = {
  files: ProjectFile[];
  activeFilePath: string | null;
  isDirty: boolean;
  projectPath: string | null;
  recentProjects: RecentProject[];
  isBusy: boolean;
  error: string | null;
  onOpenProject: () => void;
  onOpenRecentProject: (project: RecentProject) => void;
  onCreateFile: () => void;
  onSelectFile: (relativePath: string) => void;
  onMoveFile: (relativePath: string, direction: "up" | "down") => void;
  onDeleteFile: (relativePath: string) => void;
  onRenameFile: (relativePath: string) => void;
};

export function ProjectSidebar({
  files,
  activeFilePath,
  isDirty,
  projectPath,
  recentProjects,
  isBusy,
  error,
  onOpenProject,
  onOpenRecentProject,
  onCreateFile,
  onSelectFile,
  onMoveFile,
  onDeleteFile,
  onRenameFile,
}: ProjectSidebarProps) {
  const [contextMenu, setContextMenu] = useState<FileContextMenu | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu() {
      setContextMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  function openFileContextMenu(event: MouseEvent, relativePath: string) {
    event.preventDefault();
    setContextMenu({
      relativePath,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <aside className="project-sidebar" aria-label="Project files">
      <div className="project-sidebar-header">
        <div className="project-sidebar-actions">
          <button
            type="button"
            className="project-open-button"
            disabled={isBusy}
            onClick={onOpenProject}
          >
            Open folder
          </button>
          <button
            type="button"
            className="project-open-button"
            disabled={isBusy}
            onClick={onCreateFile}
          >
            New file
          </button>
        </div>
        {projectPath ? <span className="project-path">{projectPath}</span> : null}
      </div>

      {error ? <p className="project-error">{error}</p> : null}

      {recentProjects.length > 0 ? (
        <section className="recent-projects" aria-label="Recent projects">
          <h2>Recent</h2>
          {recentProjects.map((project) => (
            <button
              key={`${project.kind}:${project.id}`}
              type="button"
              className="recent-project"
              disabled={isBusy}
              onClick={() => onOpenRecentProject(project)}
            >
              {project.label}
            </button>
          ))}
        </section>
      ) : null}

      <nav className="project-file-list" aria-label="Markdown files">
        {files.length > 0 ? (
          files.map((file, index) => {
            const isActive = file.relativePath === activeFilePath;
            const label = `${file.relativePath}${isActive && isDirty ? " *" : ""}`;

            return (
              <div className="project-file-row" key={file.relativePath}>
                <button
                  type="button"
                  className={isActive ? "project-file active" : "project-file"}
                  aria-current={isActive ? "page" : undefined}
                  disabled={isBusy}
                  onClick={() => onSelectFile(file.relativePath)}
                  onContextMenu={(event) => openFileContextMenu(event, file.relativePath)}
                >
                  {label}
                </button>
                <div
                  className="project-file-order-controls"
                  aria-label={`${file.relativePath} order`}
                >
                  <button
                    type="button"
                    aria-label={`Move ${file.relativePath} up`}
                    disabled={isBusy || index === 0}
                    onClick={() => onMoveFile(file.relativePath, "up")}
                  >
                    ^
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${file.relativePath} down`}
                    disabled={isBusy || index === files.length - 1}
                    onClick={() => onMoveFile(file.relativePath, "down")}
                  >
                    v
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="project-empty">No Markdown files</p>
        )}
      </nav>

      {contextMenu ? (
        <div
          className="project-file-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            onClick={() => {
              onRenameFile(contextMenu.relativePath);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isBusy}
            onClick={() => {
              onDeleteFile(contextMenu.relativePath);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}
