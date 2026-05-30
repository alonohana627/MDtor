import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBrowserProjectFile,
  deleteBrowserProjectFile,
  openBrowserProjectFolder,
  readBrowserProjectAsset,
  readBrowserProjectFile,
  renameBrowserProjectFile,
  saveBrowserProjectFile,
  scanBrowserProjectFolder,
  type BrowserProjectFile,
} from "../../../src/services/browserProjectFiles";

class TestFileHandle {
  kind = "file" as const;
  name: string;
  content: string;

  constructor(name: string, content = "") {
    this.name = name;
    this.content = content;
  }

  async getFile() {
    return new File([this.content], this.name);
  }

  async createWritable() {
    return {
      write: async (content: string) => {
        this.content = content;
      },
      close: async () => {},
    };
  }
}

class TestDirectoryHandle {
  kind = "directory" as const;
  name: string;
  directories = new Map<string, TestDirectoryHandle>();
  files = new Map<string, TestFileHandle>();

  constructor(name: string) {
    this.name = name;
  }

  async *entries() {
    for (const entry of this.directories) {
      yield entry;
    }

    for (const entry of this.files) {
      yield entry;
    }
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const existingDirectory = this.directories.get(name);

    if (existingDirectory) {
      return existingDirectory;
    }

    if (!options?.create) {
      throwNotFound();
    }

    const directory = new TestDirectoryHandle(name);
    this.directories.set(name, directory);

    return directory;
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const existingFile = this.files.get(name);

    if (existingFile) {
      return existingFile;
    }

    if (!options?.create) {
      throwNotFound();
    }

    const file = new TestFileHandle(name);
    this.files.set(name, file);

    return file;
  }

  async removeEntry(name: string) {
    if (!this.files.delete(name) && !this.directories.delete(name)) {
      throwNotFound();
    }
  }
}

function throwNotFound(): never {
  const error = new Error("Not found");
  error.name = "NotFoundError";
  throw error;
}

function asDirectoryHandle(directory: TestDirectoryHandle) {
  return directory as unknown as FileSystemDirectoryHandle;
}

describe("browserProjectFiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a browser folder and collects Markdown files recursively", async () => {
    const root = new TestDirectoryHandle("Book");
    const notes = new TestDirectoryHandle("notes");
    notes.files.set("idea.md", new TestFileHandle("idea.md", "# Idea"));
    notes.files.set("draft.txt", new TestFileHandle("draft.txt", "ignore"));
    root.directories.set("notes", notes);
    root.files.set("readme.markdown", new TestFileHandle("readme.markdown", "# Readme"));
    vi.stubGlobal(
      "showDirectoryPicker",
      vi.fn().mockResolvedValue(asDirectoryHandle(root)),
    );

    const project = await openBrowserProjectFolder();

    expect(project).toMatchObject({
      id: expect.stringContaining("Book:"),
      name: "Book",
      files: [{ relativePath: "notes/idea.md" }, { relativePath: "readme.markdown" }],
    });
    expect(project?.fileHandles.has("notes/idea.md")).toBe(true);
    expect(project?.fileHandles.has("notes/draft.txt")).toBe(false);
    expect(window.showDirectoryPicker).toHaveBeenCalledWith({
      id: "mdtor-project-folder",
      mode: "readwrite",
    });
  });

  it("scans existing browser folder handles into sorted Markdown project files", async () => {
    const root = new TestDirectoryHandle("Book");
    root.files.set("z.md", new TestFileHandle("z.md"));
    root.files.set("a.markdown", new TestFileHandle("a.markdown"));
    root.files.set("ignore.txt", new TestFileHandle("ignore.txt"));

    const project = await scanBrowserProjectFolder(asDirectoryHandle(root));

    expect(project.files).toEqual([
      { relativePath: "a.markdown" },
      { relativePath: "z.md" },
    ]);
    expect(project.fileHandles.has("a.markdown")).toBe(true);
    expect(project.fileHandles.has("z.md")).toBe(true);
  });

  it("reads and saves browser project files through file handles", async () => {
    const handle = new TestFileHandle("chapter.md", "# Old");
    const fileHandles = new Map<string, BrowserProjectFile>([
      [
        "chapter.md",
        { kind: "writable", handle: handle as unknown as FileSystemFileHandle },
      ],
    ]);

    await expect(readBrowserProjectFile(fileHandles, "chapter.md")).resolves.toBe(
      "# Old",
    );
    await saveBrowserProjectFile(fileHandles, "chapter.md", "# New");

    expect(handle.content).toBe("# New");
    await expect(readBrowserProjectFile(fileHandles, "missing.md")).rejects.toThrow(
      "Could not find the selected Markdown file.",
    );
    await expect(
      saveBrowserProjectFile(fileHandles, "missing.md", "# Missing"),
    ).rejects.toThrow("Could not find the selected Markdown file.");
  });

  it("creates Markdown files in new subdirectories", async () => {
    const root = new TestDirectoryHandle("root");
    const fileHandles = new Map<string, BrowserProjectFile>();

    await createBrowserProjectFile(asDirectoryHandle(root), fileHandles, "notes/idea.md");

    expect(root.directories.get("notes")?.files.has("idea.md")).toBe(true);
    expect(fileHandles.has("notes/idea.md")).toBe(true);
  });

  it("deletes Markdown files and removes their cached file handles", async () => {
    const root = new TestDirectoryHandle("root");
    root.files.set("old.md", new TestFileHandle("old.md"));
    const fileHandles = new Map<string, BrowserProjectFile>([
      [
        "old.md",
        {
          kind: "writable",
          handle: root.files.get("old.md") as unknown as FileSystemFileHandle,
        },
      ],
    ]);

    await deleteBrowserProjectFile(asDirectoryHandle(root), fileHandles, "old.md");

    expect(root.files.has("old.md")).toBe(false);
    expect(fileHandles.has("old.md")).toBe(false);
  });

  it("renames Markdown files by creating the destination and deleting the source", async () => {
    const root = new TestDirectoryHandle("root");
    root.files.set("old.md", new TestFileHandle("old.md", "# Old"));
    const fileHandles = new Map<string, BrowserProjectFile>([
      [
        "old.md",
        {
          kind: "writable",
          handle: root.files.get("old.md") as unknown as FileSystemFileHandle,
        },
      ],
    ]);

    await renameBrowserProjectFile(
      asDirectoryHandle(root),
      fileHandles,
      "old.md",
      "notes/new.md",
    );

    expect(root.files.has("old.md")).toBe(false);
    expect(root.directories.get("notes")?.files.get("new.md")?.content).toBe("# Old");
    expect(fileHandles.has("old.md")).toBe(false);
    expect(fileHandles.has("notes/new.md")).toBe(true);
  });

  it("reads relative local image assets", async () => {
    const root = new TestDirectoryHandle("root");
    const notes = new TestDirectoryHandle("notes");
    const images = new TestDirectoryHandle("images");
    images.files.set("cover.png", new TestFileHandle("cover.png", "image-bytes"));
    notes.directories.set("images", images);
    root.directories.set("notes", notes);

    await expect(
      readBrowserProjectAsset(
        asDirectoryHandle(root),
        "notes/chapter.md",
        "images/cover.png",
      ).then((file) => file.text()),
    ).resolves.toBe("image-bytes");
  });

  it("rejects unsafe or unsupported image asset paths", async () => {
    const root = new TestDirectoryHandle("root");

    await expect(
      readBrowserProjectAsset(asDirectoryHandle(root), "chapter.md", "../cover.png"),
    ).rejects.toThrow("inside the project folder");

    await expect(
      readBrowserProjectAsset(asDirectoryHandle(root), "chapter.md", "cover.txt"),
    ).rejects.toThrow("Only local image files");
  });

  it("rejects existing files even when they are empty", async () => {
    const root = new TestDirectoryHandle("root");
    root.files.set("empty.md", new TestFileHandle("empty.md"));

    await expect(
      createBrowserProjectFile(asDirectoryHandle(root), new Map(), "empty.md"),
    ).rejects.toThrow("A file already exists at that path.");
  });

  it("rejects unsafe relative paths before creating or deleting files", async () => {
    const root = new TestDirectoryHandle("root");

    await expect(
      createBrowserProjectFile(asDirectoryHandle(root), new Map(), "../escape.md"),
    ).rejects.toThrow("safe relative");

    await expect(
      deleteBrowserProjectFile(asDirectoryHandle(root), new Map(), "../escape.md"),
    ).rejects.toThrow("inside the project folder");
  });

  it("rejects opening folders when the browser picker is unavailable", async () => {
    vi.stubGlobal("showDirectoryPicker", undefined);

    await expect(openBrowserProjectFolder()).rejects.toThrow(
      "This browser cannot open local folders",
    );
  });

  it("returns null when browser folder picking is cancelled", async () => {
    const error = new Error("cancelled");
    error.name = "AbortError";
    vi.stubGlobal("showDirectoryPicker", vi.fn().mockRejectedValue(error));

    await expect(openBrowserProjectFolder()).resolves.toBeNull();
  });
});
