import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DocumentOutline } from "./components/DocumentOutline";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreviewPane } from "./components/MarkdownPreviewPane";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useProjectWorkspace } from "./hooks/useProjectWorkspace";
import { getDocumentStats } from "./markdown/documentStats";
import { getMarkdownOutline } from "./markdown/outline";
import { getProjectLabel } from "./project/projectUtils";
import { exportMarkdownDocument, type ExportFormat } from "./services/documentExport";
import { type DocumentDirection, type Theme } from "./types";
import "./App.css";

const SPLIT_STORAGE_KEY = "mdtor:editor-preview-split";

function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [direction, setDirection] = useState<DocumentDirection>("ltr");
  const [splitPercent, setSplitPercent] = useState(() => {
    const storedValue = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));

    return Number.isFinite(storedValue) && storedValue >= 25 && storedValue <= 75
      ? storedValue
      : 50;
  });
  const [isZenMode, setIsZenMode] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const scrollSyncSourceRef = useRef<"editor" | "preview" | null>(null);
  const scrollSyncReleaseTimerRef = useRef<number | null>(null);
  const workspace = useProjectWorkspace();
  const outline = useMemo(
    () => getMarkdownOutline(workspace.markdown),
    [workspace.markdown],
  );
  const stats = useMemo(() => getDocumentStats(workspace.markdown), [workspace.markdown]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  function jumpToLine(line: number) {
    const editor = workspace.editorRef.current;
    const lines = workspace.markdown.split("\n");
    const selectionStart = lines
      .slice(0, Math.max(0, line - 1))
      .reduce((offset, currentLine) => offset + currentLine.length + 1, 0);

    workspace.setCurrentLine(line);

    if (editor) {
      window.requestAnimationFrame(() => {
        const previewTarget = previewRef.current?.querySelector(
          `[data-source-line="${line}"]`,
        );

        editor.focus();
        editor.setSelectionRange(selectionStart, selectionStart);
        editor.scrollTo({
          top: Math.max(0, (line - 1) * 24 - editor.clientHeight / 3),
          behavior: "auto",
        });
        previewTarget?.scrollIntoView?.({ block: "start", behavior: "auto" });
      });
    }
  }

  function getScrollRatio(element: HTMLElement) {
    const scrollableHeight = element.scrollHeight - element.clientHeight;

    return scrollableHeight > 0 ? element.scrollTop / scrollableHeight : 0;
  }

  function syncScrollPosition(
    sourceName: "editor" | "preview",
    source: HTMLElement,
    target: HTMLElement | null,
  ) {
    if (!target) {
      return;
    }

    if (scrollSyncSourceRef.current && scrollSyncSourceRef.current !== sourceName) {
      return;
    }

    const targetScrollableHeight = target.scrollHeight - target.clientHeight;

    if (targetScrollableHeight <= 0) {
      return;
    }

    scrollSyncSourceRef.current = sourceName;
    target.scrollTop = getScrollRatio(source) * targetScrollableHeight;

    if (scrollSyncReleaseTimerRef.current) {
      window.clearTimeout(scrollSyncReleaseTimerRef.current);
    }

    scrollSyncReleaseTimerRef.current = window.setTimeout(() => {
      scrollSyncSourceRef.current = null;
      scrollSyncReleaseTimerRef.current = null;
    }, 120);
  }

  function handleEditorScroll(textarea: HTMLTextAreaElement) {
    syncScrollPosition("editor", textarea, previewRef.current);
  }

  function handlePreviewScroll(preview: HTMLElement) {
    syncScrollPosition("preview", preview, workspace.editorRef.current);
  }

  function startSplitResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const workspaceElement = event.currentTarget.parentElement;

    if (!workspaceElement) {
      return;
    }

    const resizeElement = workspaceElement;
    event.currentTarget.setPointerCapture(event.pointerId);

    function handlePointerMove(moveEvent: PointerEvent) {
      const rect = resizeElement.getBoundingClientRect();
      const isVerticalLayout = window.matchMedia("(max-width: 760px)").matches;
      const nextPercent = isVerticalLayout
        ? ((moveEvent.clientY - rect.top) / rect.height) * 100
        : ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const clampedPercent = Math.min(75, Math.max(25, nextPercent));

      setSplitPercent(clampedPercent);
      window.localStorage.setItem(SPLIT_STORAGE_KEY, String(clampedPercent));
    }

    function stopResize() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  }

  async function handleExport(format: ExportFormat) {
    setExportError(null);

    try {
      await exportMarkdownDocument({
        markdown: workspace.markdown,
        activeFilePath: workspace.activeFilePath,
        format,
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "M") {
        event.preventDefault();
        setIsZenMode((currentValue) => !currentValue);
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, []);

  return (
    <main
      className="app-shell"
      data-theme={theme}
      data-zen={isZenMode ? "true" : "false"}
    >
      {!isZenMode ? <ThemeToggle theme={theme} onToggle={toggleTheme} /> : null}
      {!isZenMode ? (
        <div className="writer-toolbar" aria-label="Writer tools">
          <div className="writer-stat" aria-label="Document statistics">
            {stats.words} words | {stats.characters} chars | {stats.readingMinutes} min
          </div>
          <button type="button" onClick={() => void handleExport("html")}>
            HTML
          </button>
          <button type="button" onClick={() => void handleExport("pdf")}>
            PDF
          </button>
          <button type="button" onClick={() => void handleExport("docx")}>
            DOCX
          </button>
          <button
            type="button"
            aria-pressed={isTypewriterMode}
            onClick={() => setIsTypewriterMode((currentValue) => !currentValue)}
          >
            Typewriter
          </button>
          <button type="button" onClick={() => setIsZenMode(true)}>
            Zen
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="zen-exit-button"
          onClick={() => setIsZenMode(false)}
        >
          Exit Zen
        </button>
      )}
      <ProjectSidebar
        files={workspace.projectFiles}
        activeFilePath={workspace.activeFilePath}
        isDirty={workspace.isDirty}
        projectPath={getProjectLabel(workspace.projectSource)}
        recentProjects={workspace.recentProjects}
        isBusy={workspace.isBusy}
        error={workspace.projectError}
        onOpenProject={workspace.openProjectFolder}
        onOpenRecentProject={workspace.openRecentProject}
        onCreateFile={workspace.createNewFile}
        onSelectFile={workspace.switchFile}
        onMoveFile={workspace.moveProjectFile}
        onDeleteFile={workspace.deleteFile}
        onRenameFile={workspace.renameFile}
      />
      <div
        className="writer-workspace"
        style={{ "--editor-split": `${splitPercent}%` } as CSSProperties}
      >
        <MarkdownEditor
          value={workspace.markdown}
          currentLine={workspace.currentLine}
          activeFilePath={workspace.activeFilePath}
          isDirty={workspace.isDirty}
          direction={direction}
          isSaveDisabled={workspace.isBusy || !workspace.activeFilePath}
          isTypewriterMode={isTypewriterMode}
          onChange={workspace.setMarkdown}
          onCurrentLineChange={workspace.setCurrentLine}
          onEditorScroll={handleEditorScroll}
          onSave={workspace.handleManualSave}
          onDirectionChange={setDirection}
          editorRef={workspace.editorRef}
        />
        <button
          type="button"
          className="split-resizer"
          aria-label="Resize editor and preview panes"
          onPointerDown={startSplitResize}
        />
        <MarkdownPreviewPane
          previewRef={previewRef}
          markdown={workspace.markdown}
          currentLine={workspace.currentLine}
          theme={theme}
          direction={direction}
          loadImage={workspace.loadProjectImage}
          onPreviewScroll={handlePreviewScroll}
        />
      </div>
      {!isZenMode ? (
        <DocumentOutline
          items={outline}
          currentLine={workspace.currentLine}
          onSelectLine={jumpToLine}
        />
      ) : null}
      {exportError ? <p className="export-error">{exportError}</p> : null}
    </main>
  );
}

export default App;
