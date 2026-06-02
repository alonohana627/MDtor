import {
  memo,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type ProjectFile } from "../../services/projectFiles";
import { type RecentProject } from "../../services/projectPersistence";
import {
  buildProjectTree,
  flattenProjectTree,
  getFolderAncestors,
  getParentFolderPath,
  getProjectTreeStorageKey,
  type VisibleProjectTreeNode,
} from "./projectTree";
import "./ProjectSidebar.css";

type ContextMenu = {
  target: VisibleProjectTreeNode | null;
  x: number;
  y: number;
};

type RenamingItem = {
  kind: "file" | "folder";
  relativePath: string;
};

export type ProjectSidebarProps = {
  files: ProjectFile[];
  activeFilePath: string | null;
  isDirty: boolean;
  projectPath: string | null;
  recentProjects: RecentProject[];
  isBusy: boolean;
  error: string | null;
  canRevealFiles?: boolean;
  onOpenProject: () => void;
  onOpenRecentProject: (project: RecentProject) => void;
  onCreateFile: (initialPath?: string) => void;
  onCreateFolder?: (parentPath?: string) => void;
  onRefreshProject?: () => void;
  onRevealFile?: (relativePath: string) => void;
  onSelectFile: (relativePath: string) => void;
  onDeleteFile: (relativePath: string) => void;
  onDeleteFolder?: (relativePath: string) => void;
  onRenameFile: (relativePath: string, nextPath?: string) => void;
  onRenameFolder?: (relativePath: string, nextPath?: string) => void;
  onResizeStart?: (event: PointerEvent<HTMLButtonElement>) => void;
};

export const ProjectSidebar = memo(function ProjectSidebar({
  files,
  activeFilePath,
  isDirty,
  projectPath,
  recentProjects,
  isBusy,
  error,
  canRevealFiles = false,
  onOpenProject,
  onOpenRecentProject,
  onCreateFile,
  onCreateFolder,
  onRefreshProject,
  onRevealFile,
  onSelectFile,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
  onResizeStart,
}: ProjectSidebarProps) {
  const storageKey = getProjectTreeStorageKey(projectPath);
  const tree = useMemo(() => buildProjectTree(files), [files]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingItem, setRenamingItem] = useState<RenamingItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const hasStoredExpansionRef = useRef(false);
  const visibleNodes = useMemo(
    () => flattenProjectTree(tree, expandedFolders),
    [expandedFolders, tree],
  );
  const selectedNode =
    visibleNodes.find((node) => node.id === selectedNodeId) ??
    visibleNodes.find(
      (node) => node.kind === "file" && node.relativePath === activeFilePath,
    ) ??
    visibleNodes[0] ??
    null;

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);
    const nextExpandedFolders = readExpandedFolders(storedValue);

    for (const ancestor of activeFilePath ? getFolderAncestors(activeFilePath) : []) {
      nextExpandedFolders.add(ancestor);
    }

    hasStoredExpansionRef.current = true;
    setExpandedFolders(nextExpandedFolders);
  }, [activeFilePath, storageKey]);

  useEffect(() => {
    if (!hasStoredExpansionRef.current) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedFolders)));
  }, [expandedFolders, storageKey]);

  useEffect(() => {
    if (!activeFilePath) {
      return;
    }

    const activeNodeId = `file:${activeFilePath}`;

    setSelectedNodeId(activeNodeId);
    window.requestAnimationFrame(() => {
      itemRefs.current.get(activeNodeId)?.scrollIntoView?.({
        block: "nearest",
        inline: "nearest",
      });
    });
  }, [activeFilePath, visibleNodes.length]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu() {
      setContextMenu(null);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
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

  function toggleFolder(relativePath: string) {
    setExpandedFolders((currentFolders) => {
      const nextFolders = new Set(currentFolders);

      if (nextFolders.has(relativePath)) {
        nextFolders.delete(relativePath);
      } else {
        nextFolders.add(relativePath);
      }

      return nextFolders;
    });
  }

  function selectNode(node: VisibleProjectTreeNode) {
    setSelectedNodeId(node.id);

    if (node.kind === "file") {
      onSelectFile(node.relativePath);
      return;
    }

    toggleFolder(node.relativePath);
  }

  function openContextMenu(event: MouseEvent, target: VisibleProjectTreeNode | null) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(target?.id ?? selectedNodeId);
    setContextMenu({
      target,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleTreeKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (renamingItem) {
      return;
    }

    if (!selectedNode || visibleNodes.length === 0) {
      return;
    }

    const selectedIndex = visibleNodes.findIndex((node) => node.id === selectedNode.id);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNode(visibleNodes[Math.min(visibleNodes.length - 1, selectedIndex + 1)]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNode(visibleNodes[Math.max(0, selectedIndex - 1)]);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (selectedNode.kind === "folder" && !selectedNode.isExpanded) {
        toggleFolder(selectedNode.relativePath);
      } else if (selectedNode.kind === "folder") {
        focusNode(visibleNodes[selectedIndex + 1] ?? selectedNode);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (selectedNode.kind === "folder" && selectedNode.isExpanded) {
        toggleFolder(selectedNode.relativePath);
      } else {
        focusParentNode(selectedNode);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectNode(selectedNode);
    } else if (event.key === "F2") {
      event.preventDefault();
      startRename(selectedNode);
    } else if (event.key === "Delete" && canDeleteNode(selectedNode)) {
      event.preventDefault();
      deleteNode(selectedNode);
    } else if (event.key === "Escape") {
      setContextMenu(null);
      setRenamingItem(null);
    }
  }

  function focusNode(node: VisibleProjectTreeNode | undefined) {
    if (!node) {
      return;
    }

    setSelectedNodeId(node.id);
    window.requestAnimationFrame(() => {
      itemRefs.current.get(node.id)?.focus();
    });
  }

  function focusParentNode(node: VisibleProjectTreeNode) {
    const parentFolderPath = getParentFolderPath(node);

    if (!parentFolderPath) {
      return;
    }

    focusNode(
      visibleNodes.find((visibleNode) => visibleNode.relativePath === parentFolderPath),
    );
  }

  function startRename(node: VisibleProjectTreeNode | null) {
    if (!node || !canRenameNode(node) || isBusy) {
      return;
    }

    setRenamingItem({ kind: node.kind, relativePath: node.relativePath });
    setRenameValue(node.relativePath);
    setContextMenu(null);
  }

  function submitRename() {
    if (!renamingItem) {
      return;
    }

    const nextValue = renameValue.trim();
    const { kind, relativePath } = renamingItem;

    setRenamingItem(null);

    if (nextValue && nextValue !== relativePath) {
      if (kind === "file") {
        onRenameFile(relativePath, nextValue);
      } else {
        onRenameFolder?.(relativePath, nextValue);
      }
    }
  }

  function canRenameNode(node: VisibleProjectTreeNode) {
    return node.kind === "file" || Boolean(onRenameFolder);
  }

  function canDeleteNode(node: VisibleProjectTreeNode) {
    return node.kind === "file" || Boolean(onDeleteFolder);
  }

  function deleteNode(node: VisibleProjectTreeNode) {
    if (node.kind === "file") {
      onDeleteFile(node.relativePath);
    } else {
      onDeleteFolder?.(node.relativePath);
    }
  }

  function createFileInTarget(target: VisibleProjectTreeNode | null) {
    const folderPath = getTargetFolderPath(target);
    const initialPath = folderPath ? `${folderPath}/untitled.md` : undefined;

    onCreateFile(initialPath);
  }

  function createFolderInTarget(target: VisibleProjectTreeNode | null) {
    onCreateFolder?.(getTargetFolderPath(target));
  }

  function closeContextMenuAfter(action: () => void) {
    action();
    setContextMenu(null);
  }

  return (
    <aside className="project-sidebar" aria-label="Project files" dir="ltr">
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
            onClick={() => onCreateFile()}
          >
            New file
          </button>
          <button
            type="button"
            className="project-open-button"
            disabled={isBusy || !onCreateFolder}
            onClick={() => onCreateFolder?.()}
          >
            New folder
          </button>
          <button
            type="button"
            className="project-open-button"
            disabled={isBusy || !onRefreshProject}
            onClick={onRefreshProject}
          >
            Refresh
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

      <nav
        className="project-file-list"
        aria-label="Markdown files"
        onKeyDown={handleTreeKeyDown}
        onContextMenu={(event) => openContextMenu(event, null)}
      >
        {visibleNodes.length > 0 ? (
          <div role="tree" aria-label="Project Markdown tree">
            {visibleNodes.map((node) => (
              <div
                className="project-tree-row"
                key={node.id}
                role="none"
                style={{ "--tree-depth": node.depth } as CSSProperties}
              >
                {renamingItem?.relativePath === node.relativePath &&
                renamingItem.kind === node.kind ? (
                  <input
                    className="project-rename-input"
                    aria-label={`Rename ${node.relativePath}`}
                    value={renameValue}
                    autoFocus
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        submitRename();
                      } else if (event.key === "Escape") {
                        setRenamingItem(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    ref={(element) => {
                      if (element) {
                        itemRefs.current.set(node.id, element);
                      } else {
                        itemRefs.current.delete(node.id);
                      }
                    }}
                    type="button"
                    role="treeitem"
                    aria-label={getTreeItemLabel(node, activeFilePath, isDirty)}
                    aria-level={node.depth + 1}
                    aria-expanded={
                      node.kind === "folder" ? Boolean(node.isExpanded) : undefined
                    }
                    aria-current={
                      node.kind === "file" && node.relativePath === activeFilePath
                        ? "page"
                        : undefined
                    }
                    disabled={isBusy}
                    className={getTreeItemClassName(node, selectedNodeId, activeFilePath)}
                    title={node.relativePath}
                    onClick={() => selectNode(node)}
                    onFocus={() => setSelectedNodeId(node.id)}
                    onContextMenu={(event) => openContextMenu(event, node)}
                  >
                    <span className="project-tree-disclosure" aria-hidden="true">
                      {node.kind === "folder" ? (node.isExpanded ? "v" : ">") : ""}
                    </span>
                    <span className="project-tree-icon" aria-hidden="true" />
                    <span className="project-tree-name">
                      {node.name}
                      {node.kind === "file" &&
                      node.relativePath === activeFilePath &&
                      isDirty ? (
                        <span className="project-dirty-marker" aria-label="Unsaved">
                          *
                        </span>
                      ) : null}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
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
            onClick={() =>
              closeContextMenuAfter(() => createFileInTarget(contextMenu.target))
            }
          >
            New file
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isBusy || !onCreateFolder}
            onClick={() =>
              closeContextMenuAfter(() => createFolderInTarget(contextMenu.target))
            }
          >
            New folder
          </button>
          {contextMenu.target && canRenameNode(contextMenu.target) ? (
            <button
              type="button"
              role="menuitem"
              disabled={isBusy}
              onClick={() => closeContextMenuAfter(() => startRename(contextMenu.target))}
            >
              Rename
            </button>
          ) : null}
          {contextMenu.target?.kind === "file" && canRevealFiles ? (
            <button
              type="button"
              role="menuitem"
              disabled={isBusy || !onRevealFile}
              onClick={() =>
                closeContextMenuAfter(() =>
                  onRevealFile?.(contextMenu.target?.relativePath ?? ""),
                )
              }
            >
              Reveal in system file manager
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={isBusy || !onRefreshProject}
            onClick={() => closeContextMenuAfter(() => onRefreshProject?.())}
          >
            Refresh project
          </button>
          {contextMenu.target && canDeleteNode(contextMenu.target) ? (
            <button
              type="button"
              role="menuitem"
              disabled={isBusy}
              className="danger"
              onClick={() =>
                closeContextMenuAfter(() => {
                  if (contextMenu.target) {
                    deleteNode(contextMenu.target);
                  }
                })
              }
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}

      {onResizeStart ? (
        <button
          type="button"
          className="project-sidebar-resizer"
          aria-label="Resize project sidebar"
          onPointerDown={onResizeStart}
        />
      ) : null}
    </aside>
  );
});

function readExpandedFolders(storedValue: string | null) {
  if (!storedValue) {
    return new Set<string>();
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? new Set(parsedValue.filter((value): value is string => typeof value === "string"))
      : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function getTargetFolderPath(target: VisibleProjectTreeNode | null) {
  if (!target) {
    return "";
  }

  if (target.kind === "folder") {
    return target.relativePath;
  }

  return target.relativePath.split("/").slice(0, -1).join("/");
}

function getTreeItemClassName(
  node: VisibleProjectTreeNode,
  selectedNodeId: string | null,
  activeFilePath: string | null,
) {
  return [
    "project-tree-item",
    `project-tree-item-${node.kind}`,
    node.id === selectedNodeId ? "selected" : "",
    node.kind === "file" && node.relativePath === activeFilePath ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getTreeItemLabel(
  node: VisibleProjectTreeNode,
  activeFilePath: string | null,
  isDirty: boolean,
) {
  if (node.kind === "folder") {
    return node.relativePath;
  }

  return node.relativePath === activeFilePath && isDirty
    ? `${node.relativePath} unsaved`
    : node.relativePath;
}
