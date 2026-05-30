import { Fragment, ReactNode } from "react";

const inlinePattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
const safeLinkProtocols = new Set(["http:", "https:", "mailto:"]);

export function getSafeMarkdownLinkHref(href: string) {
  const trimmedHref = href.trim();

  if (!/^[a-z][a-z\d+.-]*:/i.test(trimmedHref)) {
    return null;
  }

  try {
    const url = new URL(trimmedHref);

    return safeLinkProtocols.has(url.protocol.toLowerCase()) ? trimmedHref : null;
  } catch {
    return null;
  }
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(inlinePattern).flatMap((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const safeHref = getSafeMarkdownLinkHref(link[2]);

      if (!safeHref) {
        return <span key={index}>{link[1]}</span>;
      }

      return (
        <a key={index} href={safeHref} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return renderTextWithLineBreaks(part, index);
  });
}

function renderTextWithLineBreaks(text: string, keyPrefix: number) {
  return text.split("\n").flatMap((line, index, lines) => {
    const content = <Fragment key={`${keyPrefix}-${index}`}>{line}</Fragment>;

    if (index === lines.length - 1) {
      return content;
    }

    return [content, <br key={`${keyPrefix}-${index}-br`} />];
  });
}
