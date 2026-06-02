import { type ProjectFile } from "../../services/projectFiles";

export type ProjectTreeFolderNode = {
  kind: "folder";
  id: string;
  name: string;
  relativePath: string;
  depth: number;
  children: ProjectTreeNode[];
};

export type ProjectTreeFileNode = {
  kind: "file";
  id: string;
  name: string;
  relativePath: string;
  depth: number;
};

export type ProjectTreeNode = ProjectTreeFolderNode | ProjectTreeFileNode;

export type VisibleProjectTreeNode = ProjectTreeNode & {
  isExpanded?: boolean;
};

type MutableFolderNode = ProjectTreeFolderNode & {
  folderChildren: Map<string, MutableFolderNode>;
  fileChildren: ProjectTreeFileNode[];
};

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function getProjectTreeStorageKey(projectPath: string | null) {
  return `mdtor:project-sidebar:expanded:${projectPath ?? "no-project"}`;
}

export function buildProjectTree(files: ProjectFile[]): ProjectTreeNode[] {
  const root: MutableFolderNode = createFolderNode("", "", 0);

  for (const file of files) {
    const parts = file.relativePath.split("/").filter(Boolean);
    const fileName = parts.pop();

    if (!fileName) {
      continue;
    }

    let folder = root;
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let childFolder = folder.folderChildren.get(part);

      if (!childFolder) {
        childFolder = createFolderNode(part, currentPath, folder.depth + 1);
        folder.folderChildren.set(part, childFolder);
      }

      folder = childFolder;
    }

    folder.fileChildren.push({
      kind: "file",
      id: `file:${file.relativePath}`,
      name: fileName,
      relativePath: file.relativePath,
      depth: folder.depth + 1,
    });
  }

  return sortTreeChildren(root);
}

export function flattenProjectTree(
  nodes: ProjectTreeNode[],
  expandedFolders: ReadonlySet<string>,
): VisibleProjectTreeNode[] {
  const visibleNodes: VisibleProjectTreeNode[] = [];

  for (const node of nodes) {
    visibleNodes.push(...flattenNode(node, expandedFolders));
  }

  return visibleNodes;
}

export function getFolderAncestors(relativePath: string) {
  const parts = relativePath.split("/").filter(Boolean);
  parts.pop();

  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function getParentFolderPath(node: VisibleProjectTreeNode) {
  const parts = node.relativePath.split("/").filter(Boolean);

  if (node.kind === "file") {
    parts.pop();
    return parts.join("/");
  }

  parts.pop();

  return parts.join("/");
}

function createFolderNode(
  name: string,
  relativePath: string,
  depth: number,
): MutableFolderNode {
  return {
    kind: "folder",
    id: `folder:${relativePath}`,
    name,
    relativePath,
    depth,
    children: [],
    folderChildren: new Map(),
    fileChildren: [],
  };
}

function sortTreeChildren(folder: MutableFolderNode): ProjectTreeNode[] {
  const folders = Array.from(folder.folderChildren.values())
    .sort(compareTreeNodeNames)
    .map((childFolder) => ({
      kind: "folder" as const,
      id: childFolder.id,
      name: childFolder.name,
      relativePath: childFolder.relativePath,
      depth: childFolder.depth,
      children: sortTreeChildren(childFolder),
    }));
  const files = [...folder.fileChildren].sort(compareTreeNodeNames);

  return [...folders, ...files];
}

function compareTreeNodeNames(left: { name: string }, right: { name: string }) {
  return naturalCollator.compare(left.name, right.name);
}

function flattenNode(
  node: ProjectTreeNode,
  expandedFolders: ReadonlySet<string>,
): VisibleProjectTreeNode[] {
  if (node.kind === "file") {
    return [node];
  }

  const isExpanded = expandedFolders.has(node.relativePath);
  const visibleNodes: VisibleProjectTreeNode[] = [{ ...node, isExpanded }];

  if (isExpanded) {
    for (const child of node.children) {
      visibleNodes.push(...flattenNode(child, expandedFolders));
    }
  }

  return visibleNodes;
}
