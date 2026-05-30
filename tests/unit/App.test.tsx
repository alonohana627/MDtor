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
    createNewFile: vi.fn(),
    currentLine: 1,
    deleteFile: vi.fn(),
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
    renameFile: vi.fn(),
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
    expect(screen.getByRole("button", { name: "chapter.md *" })).toHaveAttribute(
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
    fireEvent.click(themeButton);
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });

  it("shows live writer stats and exports the active document", () => {
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({ markdown: "# Chapter\n\nOne two three." }),
    );

    render(<App />);

    expect(screen.getByLabelText("Document statistics")).toHaveTextContent(
      "4 words | 25 chars | 1 min",
    );

    fireEvent.click(screen.getByRole("button", { name: "HTML" }));
    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "DOCX" }));

    expect(exportMarkdownDocumentMock).toHaveBeenCalledWith({
      markdown: "# Chapter\n\nOne two three.",
      activeFilePath: "chapter.md",
      format: "html",
    });
    expect(exportMarkdownDocumentMock).toHaveBeenCalledWith({
      markdown: "# Chapter\n\nOne two three.",
      activeFilePath: "chapter.md",
      format: "pdf",
    });
    expect(exportMarkdownDocumentMock).toHaveBeenCalledWith({
      markdown: "# Chapter\n\nOne two three.",
      activeFilePath: "chapter.md",
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
      value: vi.fn(() => ({ matches: false })),
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
      value: vi.fn(() => ({ matches: true })),
    });

    fireEvent.pointerDown(divider, { pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 700 });
    fireEvent.pointerUp(window);

    expect(window.localStorage.getItem("mdtor:editor-preview-split")).toBe("70");
  });

  it("keeps editor and preview scroll positions coupled", () => {
    vi.useFakeTimers();
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        markdown: "# One\n\nText\n\n## Two\n\nMore",
      }),
    );

    render(<App />);

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
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

    expect(preview.scrollTop).toBe(500);

    preview.scrollTop = 900;
    fireEvent.scroll(preview);
    expect(editor.scrollTop).toBe(250);

    vi.advanceTimersByTime(120);
    preview.scrollTop = 750;
    fireEvent.scroll(preview);

    expect(editor.scrollTop).toBe(375);
  });

  it("does not force scroll coupling when the target cannot scroll", () => {
    useProjectWorkspaceMock.mockReturnValue(createWorkspace());

    render(<App />);

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
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

    fireEvent.click(screen.getByRole("button", { name: "HTML" }));

    expect(await screen.findByText("failed export")).toBeInTheDocument();
  });

  it("jumps from outline items to the selected editor line", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const setCurrentLine = vi.fn();
    useProjectWorkspaceMock.mockReturnValue(
      createWorkspace({
        currentLine: 1,
        markdown: "# One\n\nText\n\n## Two\n\nMore",
        setCurrentLine,
      }),
    );

    render(<App />);

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
    const setSelectionRange = vi.spyOn(editor, "setSelectionRange");
    const targetHeading = screen.getByRole("heading", { name: "Two" });
    Object.defineProperty(targetHeading, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(editor, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Two" }));

    expect(setCurrentLine).toHaveBeenCalledWith(5);
    expect(setSelectionRange).toHaveBeenCalledWith(13, 13);
    expect(editor.scrollTo).toHaveBeenCalled();
    expect(targetHeading.scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "auto",
    });
  });
});
