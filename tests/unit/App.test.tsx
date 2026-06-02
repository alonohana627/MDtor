import { fireEvent, render, screen } from "@testing-library/react";
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
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({ markdown: "# Chapter\n\nOne two three." }),
    );
    exportMarkdownDocumentMock.mockResolvedValue(true);

    render(<App />);

    expect(screen.getByLabelText("Document statistics")).toHaveTextContent(
      "4 words | 25 chars | 1 min",
    );

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Export DOCX" }));

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

  it("shows export errors from failed exports", async () => {
    exportMarkdownDocumentMock.mockRejectedValueOnce("failed export");
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(await screen.findByText("failed export")).toBeInTheDocument();
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
});
