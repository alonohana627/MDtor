import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  markdownToDocxBytes,
  markdownToPdfBytes,
  markdownToStandaloneHtml,
} from "../markdown/exportMarkdown";

export type ExportFormat = "pdf" | "docx" | "html";

type ExportOptions = {
  markdown: string;
  activeFilePath: string | null;
  format: ExportFormat;
};

const EXPORT_CONFIG = {
  pdf: {
    extension: "pdf",
    mimeType: "application/pdf",
    name: "PDF",
  },
  docx: {
    extension: "docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    name: "Word document",
  },
  html: {
    extension: "html",
    mimeType: "text/html;charset=utf-8",
    name: "HTML document",
  },
} satisfies Record<
  ExportFormat,
  { extension: string; mimeType: string; name: string }
>;

function getBaseFileName(activeFilePath: string | null) {
  const fileName = activeFilePath?.split("/").pop() ?? "document.md";

  return fileName.replace(/\.(md|markdown)$/i, "") || "document";
}

function createExportPayload({
  markdown,
  activeFilePath,
  format,
}: ExportOptions): string | Uint8Array {
  const title = getBaseFileName(activeFilePath);

  if (format === "html") {
    return markdownToStandaloneHtml(markdown, title);
  }

  if (format === "pdf") {
    return markdownToPdfBytes(markdown, title);
  }

  return markdownToDocxBytes(markdown);
}

async function saveInTauri(
  data: string | Uint8Array,
  format: ExportFormat,
  defaultPath: string,
) {
  const config = EXPORT_CONFIG[format];
  const selectedPath = await save({
    defaultPath,
    filters: [{ name: config.name, extensions: [config.extension] }],
    title: `Export ${config.name}`,
  });

  if (!selectedPath) {
    return false;
  }

  await invoke("save_export_file", {
    path: selectedPath,
    bytes: Array.from(typeof data === "string" ? new TextEncoder().encode(data) : data),
  });

  return true;
}

async function saveInBrowser(
  data: string | Uint8Array,
  format: ExportFormat,
  defaultPath: string,
) {
  const config = EXPORT_CONFIG[format];
  const blob = new Blob([data], { type: config.mimeType });

  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: defaultPath,
      types: [
        {
          description: config.name,
          accept: { [config.mimeType]: [`.${config.extension}`] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = defaultPath;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function exportMarkdownDocument(options: ExportOptions) {
  const config = EXPORT_CONFIG[options.format];
  const defaultPath = `${getBaseFileName(options.activeFilePath)}.${config.extension}`;
  const data = createExportPayload(options);

  return isTauri()
    ? saveInTauri(data, options.format, defaultPath)
    : saveInBrowser(data, options.format, defaultPath);
}
