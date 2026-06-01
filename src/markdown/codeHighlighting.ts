import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerAliases(["sh", "shell", "zsh"], { languageName: "bash" });
hljs.registerAliases(["html", "xhtml"], { languageName: "xml" });
hljs.registerAliases(["js", "jsx"], { languageName: "javascript" });
hljs.registerAliases(["md"], { languageName: "markdown" });
hljs.registerAliases(["ts", "tsx"], { languageName: "typescript" });

export function getSupportedCodeLanguage(languageName: string) {
  const normalizedLanguageName = languageName.trim().toLowerCase();

  if (!normalizedLanguageName) {
    return null;
  }

  return hljs.getLanguage(normalizedLanguageName) ? normalizedLanguageName : null;
}

export function highlightCodeToHtml(code: string, languageName: string) {
  const supportedLanguageName = getSupportedCodeLanguage(languageName);

  if (!supportedLanguageName) {
    return escapeHtml(code);
  }

  try {
    return hljs.highlight(code, {
      language: supportedLanguageName,
      ignoreIllegals: true,
    }).value;
  } catch {
    return escapeHtml(code);
  }
}

export function renderHighlightedCodeBlockHtml(
  code: string,
  languageName: string,
  attributes = "",
) {
  const normalizedLanguageName = languageName.trim().split(/\s+/)[0] ?? "";
  const languageClass = normalizedLanguageName
    ? ` language-${escapeHtml(normalizedLanguageName)}`
    : "";

  return `<pre${attributes}><code class="hljs${languageClass}">${highlightCodeToHtml(
    code,
    normalizedLanguageName,
  )}</code></pre>\n`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
