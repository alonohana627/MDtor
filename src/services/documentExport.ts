import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  markdownDocumentsToDocxBytes,
  markdownDocumentsToPdfBytes,
  markdownToDocxBytes,
  markdownToPdfBytes,
  type ExportDocumentDirection,
  type MarkdownExportDocument,
} from "../markdown/exportMarkdown";

export type ExportFormat = "pdf" | "docx";
export type { MarkdownExportDocument };

type ExportOptions = {
  markdown: string;
  activeFilePath: string | null;
  direction: ExportDocumentDirection;
  format: ExportFormat;
  documents?: MarkdownExportDocument[];
  defaultFileName?: string;
};

const EXPORT_CONFIG = {
  pdf: {
    extension: "pdf",
    mimeType: "application/pdf",
    name: "PDF",
  },
  docx: {
    extension: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    name: "Word document",
  },
} satisfies Record<ExportFormat, { extension: string; mimeType: string; name: string }>;

function getBaseFileName(filePath: string | null) {
  const fileName = filePath?.split(/[\\/]/).filter(Boolean).pop() ?? "untitled.md";

  return (
    fileName.replace(/\.(md|markdown|pdf|docx)$/i, "").trim() || "untitled"
  );
}

function getExportBaseFileName({
  activeFilePath,
  defaultFileName,
}: Pick<ExportOptions, "activeFilePath" | "defaultFileName">) {
  return getBaseFileName(defaultFileName ?? activeFilePath);
}

async function createExportPayload({
  markdown,
  activeFilePath,
  defaultFileName,
  documents,
  direction,
  format,
}: ExportOptions): Promise<Uint8Array> {
  const title = getExportBaseFileName({ activeFilePath, defaultFileName });

  if (documents && documents.length > 0) {
    return format === "pdf"
      ? markdownDocumentsToPdfBytes(documents, title, direction)
      : markdownDocumentsToDocxBytes(documents, direction);
  }

  if (format === "pdf") {
    return markdownToPdfBytes(markdown, title, direction);
  }

  return markdownToDocxBytes(markdown, direction);
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
  const defaultPath = `${getExportBaseFileName(options)}.${config.extension}`;
  const data = await createExportPayload(options);

  return isTauri()
    ? saveInTauri(data, options.format, defaultPath)
    : saveInBrowser(data, options.format, defaultPath);
}
