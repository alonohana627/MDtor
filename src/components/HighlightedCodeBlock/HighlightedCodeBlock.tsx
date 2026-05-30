import { type CSSProperties, useEffect, useState } from "react";
import { type Theme } from "../../types";
import {
  highlightCodeToTokens,
  isSupportedCodeLanguage,
  type CodeHighlightTheme,
} from "../../services/codeHighlighter";

type HighlightedCodeBlockProps = {
  code: string;
  language: string;
  isActive: boolean;
  theme: Theme;
  sourceLine?: number;
};

type CodeToken = {
  content: string;
  color?: string;
  fontStyle?: number;
};

type HighlightedLine = CodeToken[];

const shikiThemes: Record<Theme, CodeHighlightTheme> = {
  light: "github-light",
  dark: "github-dark",
};

const languageAliases: Record<string, string> = {
  cplusplus: "cpp",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  js: "javascript",
  jsx: "jsx",
  md: "markdown",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shellscript",
  shell: "shellscript",
  ts: "typescript",
  tsx: "tsx",
  yml: "yaml",
};

function createPlainLines(code: string): HighlightedLine[] {
  return code.split("\n").map((line) => [{ content: line }]);
}

function normalizeLanguage(language: string) {
  const normalized = language.trim().toLowerCase();

  return languageAliases[normalized] ?? normalized;
}

function getTokenStyle(token: CodeToken): CSSProperties {
  return {
    color: token.color,
    fontStyle: token.fontStyle && token.fontStyle & 1 ? "italic" : undefined,
    fontWeight: token.fontStyle && token.fontStyle & 2 ? 700 : undefined,
    textDecoration: token.fontStyle && token.fontStyle & 4 ? "underline" : undefined,
  };
}

export function HighlightedCodeBlock({
  code,
  language,
  isActive,
  theme,
  sourceLine,
}: HighlightedCodeBlockProps) {
  const [lines, setLines] = useState<HighlightedLine[]>(() => createPlainLines(code));
  const [resolvedLanguage, setResolvedLanguage] = useState(language || "text");

  useEffect(() => {
    let isCancelled = false;
    const lang = normalizeLanguage(language || "text");

    async function highlight() {
      setLines(createPlainLines(code));
      setResolvedLanguage(lang || "text");

      if (!isSupportedCodeLanguage(lang)) {
        setResolvedLanguage("text");
        return;
      }

      try {
        const result = await highlightCodeToTokens(code, lang, shikiThemes[theme]);

        if (!isCancelled) {
          setLines(result.tokens);
          setResolvedLanguage(lang);
        }
      } catch {
        if (!isCancelled) {
          setLines(createPlainLines(code));
          setResolvedLanguage("text");
        }
      }
    }

    highlight();

    return () => {
      isCancelled = true;
    };
  }, [code, language, theme]);

  return (
    <pre
      className={isActive ? "active-preview-block" : undefined}
      data-source-line={sourceLine}
    >
      {resolvedLanguage !== "text" ? (
        <span className="code-language-label">{resolvedLanguage}</span>
      ) : null}
      <code className="shiki-code">
        {lines.map((line, lineIndex) => (
          <span className="shiki-line" key={lineIndex}>
            {line.length > 0
              ? line.map((token, tokenIndex) => (
                  <span key={tokenIndex} style={getTokenStyle(token)}>
                    {token.content}
                  </span>
                ))
              : "\n"}
            {lineIndex < lines.length - 1 ? "\n" : null}
          </span>
        ))}
      </code>
    </pre>
  );
}
