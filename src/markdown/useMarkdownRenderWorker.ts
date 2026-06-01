import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { renderMarkdownToHtml, sanitizeMarkdownHtml } from "./markdownRenderer";

type MarkdownRenderResponse = {
  requestId: number;
  html: string;
};

const DEFAULT_RENDER_DEBOUNCE_MS = 100;

export function useMarkdownRenderWorker(
  markdown: string,
  debounceMs = DEFAULT_RENDER_DEBOUNCE_MS,
) {
  const requestIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const [renderedHtml, setRenderedHtml] = useState(() => {
    return canUseWorker() ? "" : renderMarkdownToHtml(markdown);
  });

  useEffect(() => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      const worker = getOrCreateWorker(workerRef);

      if (!worker) {
        setRenderedHtml(renderMarkdownToHtml(markdown));
        return;
      }

      worker.onmessage = (event: MessageEvent<MarkdownRenderResponse>) => {
        if (event.data.requestId !== requestIdRef.current) {
          return;
        }

        setRenderedHtml(sanitizeMarkdownHtml(event.data.html));
      };
      worker.onerror = () => {
        worker.terminate();
        workerRef.current = null;

        if (requestIdRef.current === requestId) {
          setRenderedHtml(renderMarkdownToHtml(markdown));
        }
      };
      worker.postMessage({ requestId, markdown });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debounceMs, markdown]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return renderedHtml;
}

function getOrCreateWorker(workerRef: MutableRefObject<Worker | null>) {
  if (workerRef.current) {
    return workerRef.current;
  }

  if (!canUseWorker()) {
    return null;
  }

  try {
    workerRef.current = new Worker(new URL("./markdown.worker.ts", import.meta.url), {
      type: "module",
    });

    return workerRef.current;
  } catch {
    return null;
  }
}

function canUseWorker() {
  return typeof Worker !== "undefined";
}
