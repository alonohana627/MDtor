import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { useProjectWorkspace } from "../../src/hooks/useProjectWorkspace";

vi.mock("../../src/hooks/useProjectWorkspace", () => ({
  useProjectWorkspace: vi.fn(),
}));

const useProjectWorkspaceMock = vi.mocked(useProjectWorkspace);

describe("App", () => {
  it("wires workspace state into the sidebar, editor, and preview", () => {
    useProjectWorkspaceMock.mockReturnValue({
      activeFilePath: "chapter.md",
      createNewFile: vi.fn(),
      currentLine: 1,
      deleteFile: vi.fn(),
      editorRef: { current: null },
      handleManualSave: vi.fn(),
      isBusy: false,
      isDirty: true,
      markdown: "# Chapter",
      moveProjectFile: vi.fn(),
      openProjectFolder: vi.fn(),
      projectError: null,
      projectFiles: [{ relativePath: "chapter.md" }],
      projectSource: { kind: "tauri", path: "/notes/book" },
      setCurrentLine: vi.fn(),
      setMarkdown: vi.fn(),
      switchFile: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText("/notes/book")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "chapter.md" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "chapter.md *" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "Chapter" })).toBeInTheDocument();
  });

  it("toggles theme state through the theme button", () => {
    useProjectWorkspaceMock.mockReturnValue({
      activeFilePath: null,
      createNewFile: vi.fn(),
      currentLine: 1,
      deleteFile: vi.fn(),
      editorRef: { current: null },
      handleManualSave: vi.fn(),
      isBusy: false,
      isDirty: false,
      markdown: "",
      moveProjectFile: vi.fn(),
      openProjectFolder: vi.fn(),
      projectError: null,
      projectFiles: [],
      projectSource: null,
      setCurrentLine: vi.fn(),
      setMarkdown: vi.fn(),
      switchFile: vi.fn(),
    });

    render(<App />);

    const themeButton = screen.getByRole("button", { name: "Switch to dark mode" });
    fireEvent.click(themeButton);
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });
});
