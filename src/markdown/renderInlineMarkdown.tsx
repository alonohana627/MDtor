import { Fragment, ReactNode } from "react";
import { MarkdownImage } from "./MarkdownImage";

const inlinePattern =
  /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
const safeLinkProtocols = new Set(["http:", "https:", "mailto:"]);

type InlineRenderOptions = {
  loadImage?: (src: string) => Promise<Blob>;
};

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

export function renderInlineMarkdown(
  text: string,
  options: InlineRenderOptions = {},
): ReactNode[] {
  return text.split(inlinePattern).flatMap((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      if (!options.loadImage) {
        return <span key={index}>{image[1]}</span>;
      }

      return (
        <MarkdownImage
          key={index}
          alt={image[1]}
          src={image[2]}
          loadImage={options.loadImage}
        />
      );
    }

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
