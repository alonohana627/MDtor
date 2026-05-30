import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSidebar } from "../../../src/components/ProjectSidebar";

function renderSidebar(props: Partial<Parameters<typeof ProjectSidebar>[0]> = {}) {
  const defaultProps = {
    files: [] as { relativePath: string }[],
    activeFilePath: null,
    isDirty: false,
    projectPath: null,
    recentProjects: [],
    isBusy: false,
    error: null,
    onOpenProject: vi.fn(),
    onOpenRecentProject: vi.fn(),
    onCreateFile: vi.fn(),
    onSelectFile: vi.fn(),
    onMoveFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onRenameFile: vi.fn(),
  };

  return {
    props: { ...defaultProps, ...props },
    ...render(<ProjectSidebar {...defaultProps} {...props} />),
  };
}

describe("ProjectSidebar", () => {
  it("renders Markdown files, highlights the active file, and marks it dirty", () => {
    renderSidebar({
      files: [{ relativePath: "chapter-01.md" }, { relativePath: "notes/idea.md" }],
      activeFilePath: "chapter-01.md",
      isDirty: true,
      projectPath: "/writing/book",
    });

    expect(screen.getByText("/writing/book")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "chapter-01.md *" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "notes/idea.md" })).toBeInTheDocument();
  });

  it("emits open-project, recent-project, and file-selection actions", () => {
    const onOpenProject = vi.fn();
    const onOpenRecentProject = vi.fn();
    const onCreateFile = vi.fn();
    const onSelectFile = vi.fn();

    renderSidebar({
      files: [{ relativePath: "chapter-01.md" }],
      recentProjects: [{ kind: "tauri", id: "/book", label: "/book" }],
      onOpenProject,
      onOpenRecentProject,
      onCreateFile,
      onSelectFile,
    });

    fireEvent.click(screen.getByRole("button", { name: "Open folder" }));
    fireEvent.click(screen.getByRole("button", { name: "New file" }));
    fireEvent.click(screen.getByRole("button", { name: "/book" }));
    fireEvent.click(screen.getByRole("button", { name: "chapter-01.md" }));

    expect(onOpenProject).toHaveBeenCalled();
    expect(onCreateFile).toHaveBeenCalled();
    expect(onOpenRecentProject).toHaveBeenCalledWith({
      kind: "tauri",
      id: "/book",
      label: "/book",
    });
    expect(onSelectFile).toHaveBeenCalledWith("chapter-01.md");
  });

  it("emits file reorder actions", () => {
    const onMoveFile = vi.fn();

    renderSidebar({
      files: [{ relativePath: "one.md" }, { relativePath: "two.md" }],
      onMoveFile,
    });

    fireEvent.click(screen.getByRole("button", { name: "Move two.md up" }));
    fireEvent.click(screen.getByRole("button", { name: "Move one.md down" }));

    expect(onMoveFile).toHaveBeenCalledWith("two.md", "up");
    expect(onMoveFile).toHaveBeenCalledWith("one.md", "down");
  });

  it("opens a right-click menu and emits file rename and delete actions", () => {
    const onDeleteFile = vi.fn();
    const onRenameFile = vi.fn();

    renderSidebar({
      files: [{ relativePath: "one.md" }],
      onDeleteFile,
      onRenameFile,
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }), {
      clientX: 20,
      clientY: 30,
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    expect(onRenameFile).toHaveBeenCalledWith("one.md");

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDeleteFile).toHaveBeenCalledWith("one.md");
  });

  it("renders empty and error states", () => {
    renderSidebar({ error: "Could not open project" });

    expect(screen.getByText("Could not open project")).toBeInTheDocument();
    expect(screen.getByText("No Markdown files")).toBeInTheDocument();
  });

  it("disables file actions while busy", () => {
    renderSidebar({
      files: [{ relativePath: "one.md" }, { relativePath: "two.md" }],
      isBusy: true,
    });

    expect(screen.getByRole("button", { name: "Open folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New file" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "one.md" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move two.md up" })).toBeDisabled();
  });

  it("closes the context menu on Escape", () => {
    renderSidebar({ files: [{ relativePath: "one.md" }] });

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }));

    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("closes the context menu on click outside", () => {
    renderSidebar({ files: [{ relativePath: "one.md" }] });

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }));
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(window);

    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });
});
