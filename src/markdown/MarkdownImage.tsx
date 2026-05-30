import { useEffect, useState } from "react";

type MarkdownImageProps = {
  alt: string;
  src: string;
  loadImage: (src: string) => Promise<Blob>;
};

export function MarkdownImage({ alt, src, loadImage }: MarkdownImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let nextObjectUrl: string | null = null;

    loadImage(src)
      .then((blob) => {
        if (isCancelled) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
        setIsMissing(false);
      })
      .catch(() => {
        if (!isCancelled) {
          setObjectUrl(null);
          setIsMissing(true);
        }
      });

    return () => {
      isCancelled = true;

      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [loadImage, src]);

  if (isMissing) {
    return <span className="missing-local-image">Missing image: {alt || src}</span>;
  }

  if (!objectUrl) {
    return <span className="loading-local-image">{alt || src}</span>;
  }

  return <img className="local-markdown-image" src={objectUrl} alt={alt} />;
}
