import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSidebar } from "../../../src/components/ProjectSidebar";

describe("ProjectSidebar", () => {
  it("renders Markdown files, highlights the active file, and marks it dirty", () => {
    render(
      <ProjectSidebar
        files={[{ relativePath: "chapter-01.md" }, { relativePath: "notes/idea.md" }]}
        activeFilePath="chapter-01.md"
        isDirty={true}
        projectPath="/writing/book"
        isBusy={false}
        error={null}
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    expect(screen.getByText("/writing/book")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "chapter-01.md *" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "notes/idea.md" })).toBeInTheDocument();
  });

  it("emits open-project and file-selection actions", () => {
    const onOpenProject = vi.fn();
    const onCreateFile = vi.fn();
    const onSelectFile = vi.fn();
    const onMoveFile = vi.fn();

    render(
      <ProjectSidebar
        files={[{ relativePath: "chapter-01.md" }]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={false}
        error={null}
        onOpenProject={onOpenProject}
        onCreateFile={onCreateFile}
        onSelectFile={onSelectFile}
        onMoveFile={onMoveFile}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open folder" }));
    fireEvent.click(screen.getByRole("button", { name: "New file" }));
    fireEvent.click(screen.getByRole("button", { name: "chapter-01.md" }));

    expect(onOpenProject).toHaveBeenCalled();
    expect(onCreateFile).toHaveBeenCalled();
    expect(onSelectFile).toHaveBeenCalledWith("chapter-01.md");
  });

  it("emits file reorder actions", () => {
    const onMoveFile = vi.fn();

    render(
      <ProjectSidebar
        files={[{ relativePath: "one.md" }, { relativePath: "two.md" }]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={false}
        error={null}
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={onMoveFile}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Move two.md up" }));
    fireEvent.click(screen.getByRole("button", { name: "Move one.md down" }));

    expect(onMoveFile).toHaveBeenCalledWith("two.md", "up");
    expect(onMoveFile).toHaveBeenCalledWith("one.md", "down");
  });

  it("opens a right-click menu and emits file delete actions", () => {
    const onDeleteFile = vi.fn();

    render(
      <ProjectSidebar
        files={[{ relativePath: "one.md" }]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={false}
        error={null}
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={onDeleteFile}
      />,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }), {
      clientX: 20,
      clientY: 30,
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDeleteFile).toHaveBeenCalledWith("one.md");
  });

  it("renders empty and error states", () => {
    render(
      <ProjectSidebar
        files={[]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={false}
        error="Could not open project"
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    expect(screen.getByText("Could not open project")).toBeInTheDocument();
    expect(screen.getByText("No Markdown files")).toBeInTheDocument();
  });

  it("disables file actions while busy", () => {
    render(
      <ProjectSidebar
        files={[{ relativePath: "one.md" }, { relativePath: "two.md" }]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={true}
        error={null}
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Open folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New file" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "one.md" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move two.md up" })).toBeDisabled();
  });

  it("closes the context menu on Escape", () => {
    render(
      <ProjectSidebar
        files={[{ relativePath: "one.md" }]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={false}
        error={null}
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }));

    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("closes the context menu on click outside", () => {
    render(
      <ProjectSidebar
        files={[{ relativePath: "one.md" }]}
        activeFilePath={null}
        isDirty={false}
        projectPath={null}
        isBusy={false}
        error={null}
        onOpenProject={vi.fn()}
        onCreateFile={vi.fn()}
        onSelectFile={vi.fn()}
        onMoveFile={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "one.md" }));
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(window);

    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });
});
