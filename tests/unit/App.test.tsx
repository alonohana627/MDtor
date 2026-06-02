import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { useProjectWorkspace } from "../../src/hooks/useProjectWorkspace";
import { exportMarkdownDocument } from "../../src/services/documentExport";

vi.mock("../../src/hooks/useProjectWorkspace", () => ({
  useProjectWorkspace: vi.fn(),
}));

vi.mock("../../src/services/documentExport", () => ({
  exportMarkdownDocument: vi.fn(),
}));

const useProjectWorkspaceMock = vi.mocked(useProjectWorkspace);
const exportMarkdownDocumentMock = vi.mocked(exportMarkdownDocument);

function createWorkspace(
  overrides: Partial<ReturnType<typeof useProjectWorkspace>> = {},
) {
  return {
    activeFilePath: "chapter.md",
    createNewFolder: vi.fn(),
    createNewFile: vi.fn(),
    currentLine: 1,
    deleteFile: vi.fn(),
    deleteFolder: vi.fn(),
    editorRef: { current: null },
    handleManualSave: vi.fn(),
    isBusy: false,
    isDirty: false,
    loadProjectImage: vi.fn(),
    loadProjectDocuments: vi.fn(),
    markdown: "# Chapter\n\nOne two three.",
    moveProjectFile: vi.fn(),
    openProjectFolder: vi.fn(),
    openRecentProject: vi.fn(),
    projectError: null,
    projectFiles: [{ relativePath: "chapter.md" }],
    projectSource: { kind: "tauri" as const, path: "/notes/book" },
    recentProjects: [],
    refreshProject: vi.fn(),
    revealFile: vi.fn(),
    renameFile: vi.fn(),
    renameFolder: vi.fn(),
    setCurrentLine: vi.fn(),
    setMarkdown: vi.fn(),
    switchFile: vi.fn(),
    ...overrides,
  };
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("wires workspace state into the sidebar, editor, and preview", () => {
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({ isDirty: true, markdown: "# Chapter" }),
    );

    render(<App />);

    expect(screen.getByText("/notes/book")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "chapter.md" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "chapter.md unsaved" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "Chapter" })).toBeInTheDocument();
  });

  it("toggles theme state through the theme button", () => {
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        activeFilePath: null,
        markdown: "",
        projectFiles: [],
        projectSource: null,
      }),
    );

    render(<App />);

    const themeButton = screen.getByRole("button", { name: "Switch to dark mode" });
    expect(themeButton).toHaveTextContent("D");

    fireEvent.click(themeButton);
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toHaveTextContent("L");

    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });

  it("shows live writer stats and exports the active document", async () => {
    const loadProjectDocuments = vi.fn().mockResolvedValue([
      { relativePath: "a.md", markdown: "# A" },
      { relativePath: "b.md", markdown: "# B" },
    ]);
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        activeFilePath: "chapter.md",
        loadProjectDocuments,
        markdown: "# Chapter\n\nOne two three.",
        projectFiles: [{ relativePath: "b.md" }, { relativePath: "a.md" }],
        projectSource: { kind: "tauri", path: "/notes/book" },
      }),
    );
    exportMarkdownDocumentMock.mockResolvedValue(true);

    render(<App />);

    expect(screen.getByLabelText("Document statistics")).toHaveTextContent(
      "4 words | 25 chars | 1 min",
    );

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Export DOCX" }));
    fireEvent.click(screen.getByRole("button", { name: "Export Project DOCX" }));

    expect(exportMarkdownDocumentMock).toHaveBeenCalledWith({
      markdown: "# Chapter\n\nOne two three.",
      activeFilePath: "chapter.md",
      direction: "ltr",
      format: "pdf",
    });
    expect(exportMarkdownDocumentMock).toHaveBeenCalledWith({
      markdown: "# Chapter\n\nOne two three.",
      activeFilePath: "chapter.md",
      direction: "ltr",
      format: "docx",
    });
    await waitFor(() => {
      expect(exportMarkdownDocumentMock).toHaveBeenCalledWith({
        markdown: "# Chapter\n\nOne two three.",
        activeFilePath: "chapter.md",
        defaultFileName: "book",
        direction: "ltr",
        documents: [
          { relativePath: "a.md", markdown: "# A" },
          { relativePath: "b.md", markdown: "# B" },
        ],
        format: "docx",
      });
    });
  });

  it("disables project export buttons when no project files are open", () => {
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        activeFilePath: null,
        projectFiles: [],
        projectSource: null,
      }),
    );

    render(<App />);

    expect(screen.getByRole("button", { name: "Export Project PDF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export Project DOCX" })).toBeDisabled();
  });

  it("toggles Zen Mode with the toolbar and keyboard shortcut", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Zen" }));

    expect(container.querySelector(".app-shell")).toHaveAttribute("data-zen", "true");
    expect(screen.queryByLabelText("Writer tools")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit Zen" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "M", ctrlKey: true, shiftKey: true });

    expect(container.querySelector(".app-shell")).toHaveAttribute("data-zen", "false");
    expect(screen.getByLabelText("Writer tools")).toBeInTheDocument();
  });

  it("exits Zen Mode from the exit button and toggles Typewriter Mode", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    const typewriterButton = screen.getByRole("button", { name: "Typewriter" });
    expect(typewriterButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(typewriterButton);
    expect(screen.getByRole("button", { name: "Typewriter" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Zen" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit Zen" }));

    expect(screen.getByLabelText("Writer tools")).toBeInTheDocument();
  });

  it("persists split layout changes from the divider", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    const workspace = document.querySelector(".writer-workspace") as HTMLElement;
    const divider = screen.getByRole("button", {
      name: "Resize editor and preview panes",
    });
    Object.defineProperty(workspace, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
    });
    Object.defineProperty(divider, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    fireEvent.pointerDown(divider, { pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 650 });
    fireEvent.pointerUp(window);

    expect(window.localStorage.getItem("mdtor:editor-preview-split")).toBe("65");
  });

  it("persists vertical split layout changes on narrow viewports", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    const workspace = document.querySelector(".writer-workspace") as HTMLElement;
    const divider = screen.getByRole("button", {
      name: "Resize editor and preview panes",
    });
    Object.defineProperty(workspace, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 500, height: 1000 }),
    });
    Object.defineProperty(divider, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    fireEvent.pointerDown(divider, { pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 700 });
    fireEvent.pointerUp(window);

    expect(window.localStorage.getItem("mdtor:editor-preview-split")).toBe("70");
  });

  it("keeps editor and preview scroll positions independent by default", () => {
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        markdown: "# One\n\nText\n\n## Two\n\nMore",
      }),
    );

    render(<App />);

    expect(
      screen.getByRole("button", {
        name: "Toggle editor and preview scroll sync",
      }),
    ).toHaveAttribute("aria-pressed", "false");

    const editor = document.querySelector(".cm-scroller") as HTMLElement;
    const preview = document.querySelector(".preview") as HTMLElement;
    Object.defineProperties(editor, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 250 },
    });
    Object.defineProperties(preview, {
      clientHeight: { configurable: true, value: 1000 },
      scrollHeight: { configurable: true, value: 2000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    fireEvent.scroll(editor);

    expect(preview.scrollTop).toBe(0);
  });

  it("couples editor and preview scroll positions when sync is enabled", () => {
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        markdown: "# One\n\nText\n\n## Two\n\nMore",
      }),
    );

    render(<App />);

    const syncButton = screen.getByRole("button", {
      name: "Toggle editor and preview scroll sync",
    });
    fireEvent.click(syncButton);

    expect(syncButton).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("mdtor:editor-preview-scroll-sync")).toBe("true");

    const editor = document.querySelector(".cm-scroller") as HTMLElement;
    const preview = document.querySelector(".preview") as HTMLElement;
    Object.defineProperties(editor, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    Object.defineProperties(preview, {
      clientHeight: { configurable: true, value: 1000 },
      scrollHeight: { configurable: true, value: 2000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    editor.scrollTop = 250;
    fireEvent.scroll(editor);

    expect(preview.scrollTop).toBe(250);

    preview.scrollTop = 400;
    fireEvent.scroll(preview);

    expect(editor.scrollTop).toBe(400);
  });

  it("uses persisted scroll sync preference", () => {
    window.localStorage.setItem("mdtor:editor-preview-scroll-sync", "true");
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    expect(
      screen.getByRole("button", {
        name: "Toggle editor and preview scroll sync",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("uses valid persisted layout sizes", () => {
    window.localStorage.setItem("mdtor:editor-preview-split", "64");
    window.localStorage.setItem("mdtor:project-sidebar-width", "300");
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    const { container } = render(<App />);

    expect(container.querySelector(".writer-workspace")).toHaveStyle({
      "--editor-split": "64%",
    });
    expect(container.querySelector(".app-shell")).toHaveStyle({
      "--project-sidebar-width": "300px",
    });
  });

  it("does not force scroll coupling when the target cannot scroll", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Toggle editor and preview scroll sync",
      }),
    );

    const editor = document.querySelector(".cm-scroller") as HTMLElement;
    const preview = document.querySelector(".preview") as HTMLElement;
    Object.defineProperties(editor, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 250 },
    });
    Object.defineProperties(preview, {
      clientHeight: { configurable: true, value: 1000 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    fireEvent.scroll(editor);

    expect(preview.scrollTop).toBe(0);
  });

  it("ignores scroll sync when there is no target or no scroll delta", () => {
    const workspace = createWorkspace();
    useProjectWorkspaceMock.mockReturnValue(workspace);

    render(<App />);

    const editor = document.querySelector(".cm-scroller") as HTMLElement;
    const preview = document.querySelector(".preview") as HTMLElement;
    Object.defineProperties(editor, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1500 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });
    Object.defineProperties(preview, {
      clientHeight: { configurable: true, value: 500 },
      scrollHeight: { configurable: true, value: 1500 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });

    workspace.editorRef.current = null;
    fireEvent.click(
      screen.getByRole("button", {
        name: "Toggle editor and preview scroll sync",
      }),
    );
    preview.scrollTop = 150;
    fireEvent.scroll(preview);

    expect(editor.scrollTop).toBe(100);

    workspace.editorRef.current = editor as never;
    fireEvent.click(
      screen.getByRole("button", {
        name: "Toggle editor and preview scroll sync",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Toggle editor and preview scroll sync",
      }),
    );
    fireEvent.scroll(editor);

    expect(preview.scrollTop).toBe(150);
  });

  it("shows export errors from failed exports", async () => {
    exportMarkdownDocumentMock.mockRejectedValueOnce("failed export");
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(await screen.findByText("failed export")).toBeInTheDocument();
  });

  it("shows Error messages from failed exports", async () => {
    exportMarkdownDocumentMock.mockRejectedValueOnce(new Error("pdf failed"));
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(await screen.findByText("pdf failed")).toBeInTheDocument();
  });

  it("persists project sidebar resize bounds", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    const resizer = screen.getByRole("button", {
      name: "Resize project sidebar",
    });
    Object.defineProperty(resizer, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(resizer, { pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 420 });
    fireEvent.pointerUp(window);

    expect(window.localStorage.getItem("mdtor:project-sidebar-width")).toBe("360");

    fireEvent.pointerDown(resizer, { pointerId: 2 });
    fireEvent.pointerMove(window, { clientX: 120 });
    fireEvent.pointerUp(window);

    expect(window.localStorage.getItem("mdtor:project-sidebar-width")).toBe("180");
  });

  it("ignores split resizing when the divider has no workspace parent", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    const divider = screen.getByRole("button", {
      name: "Resize editor and preview panes",
    });
    const setPointerCapture = vi.fn();
    Object.defineProperties(divider, {
      parentElement: { configurable: true, value: null },
      setPointerCapture: { configurable: true, value: setPointerCapture },
    });

    fireEvent.pointerDown(divider, { pointerId: 1 });

    expect(setPointerCapture).not.toHaveBeenCalled();
  });

  it("jumps from outline items to the selected editor line", () => {
    const setCurrentLine = vi.fn();
    const workspace = createWorkspace({
      currentLine: 1,
      markdown: "# One\n\nText\n\n## Two\n\nMore",
      setCurrentLine,
    });
    useProjectWorkspaceMock.mockReturnValue(workspace);

    render(<App />);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    const editor = workspace.editorRef.current;
    const setSelectionRange = vi.spyOn(editor!, "setSelectionRange");
    const targetHeading = screen.getByRole("heading", { name: "Two" });
    Object.defineProperty(targetHeading, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    const scrollTo = vi.spyOn(editor!, "scrollTo");

    fireEvent.click(screen.getByRole("button", { name: "Two" }));

    expect(setCurrentLine).toHaveBeenCalledWith(5);
    expect(setSelectionRange).toHaveBeenCalledWith(13, 13);
    expect(scrollTo).toHaveBeenCalled();
    expect(targetHeading.scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "auto",
    });
  });

  it("updates the active line from the outline even when the editor handle is missing", () => {
    const setCurrentLine = vi.fn();
    const workspace = createWorkspace({
      markdown: "# One\n\n## Two",
      setCurrentLine,
    });
    useProjectWorkspaceMock.mockReturnValue(workspace);

    render(<App />);

    workspace.editorRef.current = null;
    fireEvent.click(screen.getByRole("button", { name: "Two" }));

    expect(setCurrentLine).toHaveBeenCalledWith(3);
  });

  it("supports the Meta+Shift+M Zen shortcut", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    const { container } = render(<App />);

    fireEvent.keyDown(window, { key: "M", metaKey: true, shiftKey: true });

    expect(container.querySelector(".app-shell")).toHaveAttribute("data-zen", "true");
  });
});
