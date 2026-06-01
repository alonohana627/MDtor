import { renderMarkdownToRawHtml } from "./markdownRendererCore";

type MarkdownRenderRequest = {
  requestId: number;
  markdown: string;
};

type MarkdownRenderResponse = {
  requestId: number;
  html: string;
};

self.addEventListener("message", (event: MessageEvent<MarkdownRenderRequest>) => {
  const { requestId, markdown } = event.data;
  const response: MarkdownRenderResponse = {
    requestId,
    html: renderMarkdownToRawHtml(markdown),
  };

  self.postMessage(response);
});

export {};
