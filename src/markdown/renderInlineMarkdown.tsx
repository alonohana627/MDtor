import { Fragment, ReactNode } from "react";

const inlinePattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(inlinePattern).flatMap((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
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
