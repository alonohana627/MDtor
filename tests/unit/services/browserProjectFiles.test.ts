import { describe, expect, it } from "vitest";
import {
  createBrowserProjectFile,
  deleteBrowserProjectFile,
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
  it("creates Markdown files in new subdirectories", async () => {
    const root = new TestDirectoryHandle("root");
    const fileHandles = new Map<string, BrowserProjectFile>();

    await createBrowserProjectFile(asDirectoryHandle(root), fileHandles, "notes/idea.md");

    expect(root.directories.get("notes")?.files.has("idea.md")).toBe(true);
    expect(fileHandles.has("notes/idea.md")).toBe(true);
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
});
