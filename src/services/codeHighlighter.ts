import { createBundledHighlighter, createSingletonShorthands } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const codeLanguages = {
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  javascript: () => import("@shikijs/langs/javascript"),
  jsx: () => import("@shikijs/langs/jsx"),
  markdown: () => import("@shikijs/langs/markdown"),
  python: () => import("@shikijs/langs/python"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  yaml: () => import("@shikijs/langs/yaml"),
};

const codeThemes = {
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
};

export type SupportedCodeLanguage = keyof typeof codeLanguages;
export type CodeHighlightTheme = keyof typeof codeThemes;

const createCodeHighlighter = createBundledHighlighter({
  langs: codeLanguages,
  themes: codeThemes,
  engine: () => createJavaScriptRegexEngine(),
});
const { codeToTokens } = createSingletonShorthands(createCodeHighlighter);
const supportedCodeLanguages = new Set(Object.keys(codeLanguages));

export function isSupportedCodeLanguage(
  language: string,
): language is SupportedCodeLanguage {
  return supportedCodeLanguages.has(language);
}

export function highlightCodeToTokens(
  code: string,
  language: SupportedCodeLanguage,
  theme: CodeHighlightTheme,
) {
  return codeToTokens(code, {
    lang: language,
    theme,
  });
}
