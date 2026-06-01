import { memo, useEffect, useRef } from "react";
import { useMarkdownRenderWorker } from "../../markdown/useMarkdownRenderWorker";
import { type DocumentDirection } from "../../types";
import "./MarkdownPreview.css";

type MarkdownPreviewProps = {
  markdown: string;
  direction: DocumentDirection;
  currentLine: number;
};

export const MarkdownPreview = memo(function MarkdownPreview({
  markdown,
  direction,
  currentLine,
}: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const renderedHtml = useMarkdownRenderWorker(markdown);

  useEffect(() => {
    markActivePreviewLine(previewRef.current, currentLine);
  }, [currentLine, renderedHtml]);

  if (renderedHtml.trim().length === 0) {
    return <p className="empty-preview">Nothing to preview yet.</p>;
  }

  return (
    <div
      ref={previewRef}
      className="markdown-preview"
      dir={direction}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
});

function markActivePreviewLine(root: HTMLElement | null, currentLine: number) {
  if (!root) {
    return;
  }

  for (const activeElement of root.querySelectorAll(".active-preview")) {
    activeElement.classList.remove("active-preview");
    activeElement.removeAttribute("aria-current");
  }

  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>("[data-source-line][data-source-end-line]"),
  );
  const activeElement = candidates
    .filter((element) => containsLine(element, currentLine))
    .sort(getNarrowestSourceRange)[0];

  activeElement?.classList.add("active-preview");
  activeElement?.setAttribute("aria-current", "true");
}

function containsLine(element: HTMLElement, currentLine: number) {
  const startLine = Number(element.dataset.sourceLine);
  const endLine = Number(element.dataset.sourceEndLine);

  return (
    Number.isFinite(startLine) &&
    Number.isFinite(endLine) &&
    startLine <= currentLine &&
    currentLine <= endLine
  );
}

function getNarrowestSourceRange(first: HTMLElement, second: HTMLElement) {
  return getSourceRangeLength(first) - getSourceRangeLength(second);
}

function getSourceRangeLength(element: HTMLElement) {
  const startLine = Number(element.dataset.sourceLine);
  const endLine = Number(element.dataset.sourceEndLine);

  return endLine - startLine;
}
