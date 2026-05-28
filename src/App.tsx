import { useState } from "react";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreviewPane } from "./components/MarkdownPreviewPane";
import { ThemeToggle } from "./components/ThemeToggle";
import { starterMarkdown } from "./data/starterMarkdown";
import "./App.css";

export type Theme = "light" | "dark";

function App() {
  const [markdown, setMarkdown] = useState(starterMarkdown);
  const [currentLine, setCurrentLine] = useState(1);
  const [theme, setTheme] = useState<Theme>("light");

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <MarkdownEditor
        value={markdown}
        currentLine={currentLine}
        onChange={setMarkdown}
        onCurrentLineChange={setCurrentLine}
      />
      <MarkdownPreviewPane markdown={markdown} currentLine={currentLine} theme={theme} />
    </main>
  );
}

export default App;
