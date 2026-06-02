import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportMarkdownDocument } from "../../../src/services/documentExport";
import {
  markdownToDocxBytes,
  markdownToPdfBytes,
} from "../../../src/markdown/exportMarkdown";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("../../../src/markdown/exportMarkdown", () => ({
  markdownToDocxBytes: vi.fn(),
  markdownToPdfBytes: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);
const isTauriMock = vi.mocked(isTauri);
const saveMock = vi.mocked(save);
const markdownToDocxBytesMock = vi.mocked(markdownToDocxBytes);
const markdownToPdfBytesMock = vi.mocked(markdownToPdfBytes);

describe("exportMarkdownDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTauriMock.mockReturnValue(true);
    saveMock.mockResolvedValue("/exports/chapter.pdf");
    invokeMock.mockResolvedValue(undefined);
    markdownToPdfBytesMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    markdownToDocxBytesMock.mockResolvedValue(new Uint8Array([4, 5, 6]));
  });

  it("prompts for a Tauri save path and writes generated PDF bytes", async () => {
    await expect(
      exportMarkdownDocument({
        markdown: "# Chapter",
        activeFilePath: "drafts/chapter.md",
        direction: "rtl",
        format: "pdf",
      }),
    ).resolves.toBe(true);

    expect(markdownToPdfBytesMock).toHaveBeenCalledWith("# Chapter", "chapter", "rtl");
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "chapter.pdf" }),
    );
    expect(invokeMock).toHaveBeenCalledWith("save_export_file", {
      path: "/exports/chapter.pdf",
      bytes: [1, 2, 3],
    });
  });

  it("uses untitled as the default filename when no file is open", async () => {
    saveMock.mockResolvedValueOnce(null);

    await expect(
      exportMarkdownDocument({
        markdown: "# Chapter",
        activeFilePath: null,
        direction: "ltr",
        format: "docx",
      }),
    ).resolves.toBe(false);

    expect(markdownToDocxBytesMock).toHaveBeenCalledWith("# Chapter", "ltr");
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "untitled.docx" }),
    );
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("uses browser save handles when available", async () => {
    isTauriMock.mockReturnValue(false);
    const write = vi.fn();
    const close = vi.fn();

    window.showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({ write, close }),
    });

    await expect(
      exportMarkdownDocument({
        markdown: "# Chapter",
        activeFilePath: "chapter.md",
        direction: "ltr",
        format: "docx",
      }),
    ).resolves.toBe(true);

    expect(window.showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: "chapter.docx" }),
    );
    expect(write).toHaveBeenCalledWith(expect.any(Blob));
    expect(close).toHaveBeenCalled();
  });

  it("falls back to a browser download link when save handles are unavailable", async () => {
    isTauriMock.mockReturnValue(false);
    window.showSaveFilePicker = undefined;
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement");

    createElement.mockReturnValue({
      click,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });

    await expect(
      exportMarkdownDocument({
        markdown: "# Chapter",
        activeFilePath: "chapter.md",
        direction: "ltr",
        format: "pdf",
      }),
    ).resolves.toBe(true);

    expect(click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });
});
