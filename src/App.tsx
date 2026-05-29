import { useState } from "react";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreviewPane } from "./components/MarkdownPreviewPane";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useProjectWorkspace } from "./hooks/useProjectWorkspace";
import { getProjectLabel } from "./project/projectUtils";
import { type DocumentDirection, type Theme } from "./types";
import "./App.css";

function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [direction, setDirection] = useState<DocumentDirection>("ltr");
  const workspace = useProjectWorkspace();

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <ProjectSidebar
        files={workspace.projectFiles}
        activeFilePath={workspace.activeFilePath}
        isDirty={workspace.isDirty}
        projectPath={getProjectLabel(workspace.projectSource)}
        isBusy={workspace.isBusy}
        error={workspace.projectError}
        onOpenProject={workspace.openProjectFolder}
        onCreateFile={workspace.createNewFile}
        onSelectFile={workspace.switchFile}
        onMoveFile={workspace.moveProjectFile}
        onDeleteFile={workspace.deleteFile}
      />
      <MarkdownEditor
        value={workspace.markdown}
        currentLine={workspace.currentLine}
        activeFilePath={workspace.activeFilePath}
        isDirty={workspace.isDirty}
        direction={direction}
        isSaveDisabled={workspace.isBusy || !workspace.activeFilePath}
        onChange={workspace.setMarkdown}
        onCurrentLineChange={workspace.setCurrentLine}
        onSave={workspace.handleManualSave}
        onDirectionChange={setDirection}
        editorRef={workspace.editorRef}
      />
      <MarkdownPreviewPane
        markdown={workspace.markdown}
        currentLine={workspace.currentLine}
        theme={theme}
        direction={direction}
      />
    </main>
  );
}

export default App;
