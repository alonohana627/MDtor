import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportMarkdownDocument } from "../../../src/services/documentExport";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);
const isTauriMock = vi.mocked(isTauri);
const saveMock = vi.mocked(save);

describe("exportMarkdownDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTauriMock.mockReturnValue(true);
    saveMock.mockResolvedValue("/exports/chapter.pdf");
    invokeMock.mockResolvedValue(undefined);
  });

  it("prompts for a Tauri save path and writes bytes through a command", async () => {
    await expect(
      exportMarkdownDocument({
        markdown: "# Chapter",
        activeFilePath: "drafts/chapter.md",
        format: "pdf",
      }),
    ).resolves.toBe(true);

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "chapter.pdf" }),
    );
    expect(invokeMock).toHaveBeenCalledWith(
      "save_export_file",
      expect.objectContaining({ path: "/exports/chapter.pdf" }),
    );
  });

  it("returns false when the Tauri save dialog is cancelled", async () => {
    saveMock.mockResolvedValueOnce(null);

    await expect(
      exportMarkdownDocument({
        markdown: "# Chapter",
        activeFilePath: "chapter.md",
        format: "html",
      }),
    ).resolves.toBe(false);

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
        format: "docx",
      }),
    ).resolves.toBe(true);

    expect(window.showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: "chapter.docx" }),
    );
    expect(write).toHaveBeenCalled();
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
        activeFilePath: null,
        format: "html",
      }),
    ).resolves.toBe(true);

    expect(click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });
});
