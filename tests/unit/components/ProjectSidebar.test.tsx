import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProjectSidebar,
  type ProjectSidebarProps,
} from "../../../src/components/ProjectSidebar";

function renderSidebar(props: Partial<ProjectSidebarProps> = {}) {
  const defaultProps: ProjectSidebarProps = {
    files: [],
    activeFilePath: null,
    isDirty: false,
    projectPath: null,
    recentProjects: [],
    isBusy: false,
    error: null,
    canRevealFiles: false,
    onOpenProject: vi.fn(),
    onOpenRecentProject: vi.fn(),
    onCreateFile: vi.fn(),
    onCreateFolder: vi.fn(),
    onRefreshProject: vi.fn(),
    onRevealFile: vi.fn(),
    onSelectFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onDeleteFolder: vi.fn(),
    onRenameFile: vi.fn(),
    onRenameFolder: vi.fn(),
  };

  return {
    props: { ...defaultProps, ...props },
    ...render(<ProjectSidebar {...defaultProps} {...props} />),
  };
}

describe("ProjectSidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a nested tree, highlights the active file, and marks it dirty", () => {
    renderSidebar({
      files: [{ relativePath: "chapter-01.md" }, { relativePath: "notes/idea.md" }],
      activeFilePath: "notes/idea.md",
      isDirty: true,
      projectPath: "/writing/book",
    });

    expect(screen.getByText("/writing/book")).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "notes" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("treeitem", { name: "notes/idea.md unsaved" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("sorts folders before files and expands folders on click", () => {
    renderSidebar({
      files: [
        { relativePath: "zeta.md" },
        { relativePath: "docs/file-10.md" },
        { relativePath: "docs/file-2.md" },
        { relativePath: "alpha.md" },
      ],
    });

    const initialItems = screen.getAllByRole("treeitem");
    expect(initialItems.map((item) => item.getAttribute("aria-label"))).toEqual([
      "docs",
      "alpha.md",
      "zeta.md",
    ]);

    fireEvent.click(screen.getByRole("treeitem", { name: "docs" }));

    expect(
      screen.getAllByRole("treeitem").map((item) => item.getAttribute("aria-label")),
    ).toEqual(["docs", "docs/file-2.md", "docs/file-10.md", "alpha.md", "zeta.md"]);
  });

  it("emits open, create, refresh, recent, and file-selection actions", () => {
    const onOpenProject = vi.fn();
    const onOpenRecentProject = vi.fn();
    const onCreateFile = vi.fn();
    const onCreateFolder = vi.fn();
    const onRefreshProject = vi.fn();
    const onSelectFile = vi.fn();

    renderSidebar({
      files: [{ relativePath: "chapter-01.md" }],
      recentProjects: [{ kind: "tauri", id: "/book", label: "/book" }],
      onOpenProject,
      onOpenRecentProject,
      onCreateFile,
      onCreateFolder,
      onRefreshProject,
      onSelectFile,
    });

    fireEvent.click(screen.getByRole("button", { name: "Open folder" }));
    fireEvent.click(screen.getByRole("button", { name: "New file" }));
    fireEvent.click(screen.getByRole("button", { name: "New folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "/book" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "chapter-01.md" }));

    expect(onOpenProject).toHaveBeenCalled();
    expect(onCreateFile).toHaveBeenCalled();
    expect(onCreateFolder).toHaveBeenCalled();
    expect(onRefreshProject).toHaveBeenCalled();
    expect(onOpenRecentProject).toHaveBeenCalledWith({
      kind: "tauri",
      id: "/book",
      label: "/book",
    });
    expect(onSelectFile).toHaveBeenCalledWith("chapter-01.md");
  });

  it("opens a context menu and emits file actions", () => {
    const onCreateFile = vi.fn();
    const onDeleteFile = vi.fn();
    const onRenameFile = vi.fn();
    const onRevealFile = vi.fn();

    renderSidebar({
      files: [{ relativePath: "one.md" }],
      canRevealFiles: true,
      onCreateFile,
      onDeleteFile,
      onRenameFile,
      onRevealFile,
    });

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "one.md" }), {
      clientX: 20,
      clientY: 30,
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "New file" }));

    expect(onCreateFile).toHaveBeenCalledWith(undefined);

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "one.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const renameInput = screen.getByLabelText("Rename one.md");
    fireEvent.change(renameInput, { target: { value: "renamed.md" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });

    expect(onRenameFile).toHaveBeenCalledWith("one.md", "renamed.md");

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "one.md" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Reveal in system file manager" }),
    );

    expect(onRevealFile).toHaveBeenCalledWith("one.md");

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "one.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDeleteFile).toHaveBeenCalledWith("one.md");
  });

  it("opens a context menu and emits folder actions", () => {
    const onCreateFile = vi.fn();
    const onCreateFolder = vi.fn();
    const onDeleteFolder = vi.fn();
    const onRenameFolder = vi.fn();

    renderSidebar({
      files: [{ relativePath: "docs/one.md" }, { relativePath: "docs/two.md" }],
      activeFilePath: "docs/one.md",
      onCreateFile,
      onCreateFolder,
      onDeleteFolder,
      onRenameFolder,
    });

    const folderItem = screen.getByRole("treeitem", { name: "docs" });

    fireEvent.contextMenu(folderItem);
    fireEvent.click(screen.getByRole("menuitem", { name: "New file" }));

    expect(onCreateFile).toHaveBeenCalledWith("docs/untitled.md");

    fireEvent.contextMenu(folderItem);
    fireEvent.click(screen.getByRole("menuitem", { name: "New folder" }));

    expect(onCreateFolder).toHaveBeenCalledWith("docs");

    fireEvent.contextMenu(folderItem);
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    const renameInput = screen.getByLabelText("Rename docs");
    fireEvent.change(renameInput, { target: { value: "chapters" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });

    expect(onRenameFolder).toHaveBeenCalledWith("docs", "chapters");

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "docs" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDeleteFolder).toHaveBeenCalledWith("docs");
  });

  it("supports keyboard navigation, open, delete, and rename mode", async () => {
    const onSelectFile = vi.fn();
    const onDeleteFile = vi.fn();
    const onRenameFile = vi.fn();
    const onDeleteFolder = vi.fn();
    const onRenameFolder = vi.fn();

    renderSidebar({
      files: [
        { relativePath: "folder/one.md" },
        { relativePath: "one.md" },
        { relativePath: "two.md" },
      ],
      onSelectFile,
      onDeleteFile,
      onDeleteFolder,
      onRenameFile,
      onRenameFolder,
    });

    const folder = screen.getByRole("treeitem", { name: "folder" });
    const firstFile = screen.getByRole("treeitem", { name: "one.md" });
    const secondFile = screen.getByRole("treeitem", { name: "two.md" });

    folder.focus();
    fireEvent.keyDown(folder, { key: "Delete" });

    expect(onDeleteFolder).toHaveBeenCalledWith("folder");

    fireEvent.keyDown(folder, { key: "F2" });

    const folderRenameInput = screen.getByLabelText("Rename folder");
    fireEvent.change(folderRenameInput, { target: { value: "renamed-folder" } });
    fireEvent.keyDown(folderRenameInput, { key: "Enter" });

    expect(onRenameFolder).toHaveBeenCalledWith("folder", "renamed-folder");

    firstFile.focus();
    await waitFor(() => expect(firstFile).toHaveClass("selected"));
    fireEvent.keyDown(firstFile, { key: "ArrowDown" });

    await waitFor(() => expect(secondFile).toHaveFocus());

    fireEvent.keyDown(secondFile, { key: "Enter" });
    fireEvent.keyDown(secondFile, { key: "Delete" });

    expect(onSelectFile).toHaveBeenCalledWith("two.md");
    expect(onDeleteFile).toHaveBeenCalledWith("two.md");

    fireEvent.keyDown(secondFile, { key: "F2" });

    const renameInput = screen.getByLabelText("Rename two.md");
    fireEvent.change(renameInput, { target: { value: "renamed.md" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });

    expect(onRenameFile).toHaveBeenCalledWith("two.md", "renamed.md");
  });

  it("renders empty and error states", () => {
    renderSidebar({ error: "Could not open project" });

    expect(screen.getByText("Could not open project")).toBeInTheDocument();
    expect(screen.getByText("No Markdown files")).toBeInTheDocument();
  });

  it("disables actions while busy", () => {
    renderSidebar({
      files: [{ relativePath: "one.md" }],
      isBusy: true,
    });

    expect(screen.getByRole("button", { name: "Open folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New file" })).toBeDisabled();
    expect(screen.getByRole("treeitem", { name: "one.md" })).toBeDisabled();
  });

  it("closes the context menu on Escape and outside click", () => {
    renderSidebar({ files: [{ relativePath: "one.md" }] });

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "one.md" }));
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "one.md" }));
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(window);
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("renders a 150-file project without hiding root files", () => {
    renderSidebar({
      files: Array.from({ length: 150 }, (_, index) => ({
        relativePath: `file-${index}.md`,
      })),
    });

    expect(screen.getAllByRole("treeitem")).toHaveLength(150);
  });
});
