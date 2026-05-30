import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectPolling } from "../../../src/hooks/useProjectPolling";
import { scanProjectFolder } from "../../../src/services/projectFiles";
import { type ProjectFile } from "../../../src/services/projectFiles";

vi.mock("../../../src/services/projectFiles", () => ({
  scanProjectFolder: vi.fn(),
}));

const scanProjectFolderMock = vi.mocked(scanProjectFolder);

function renderPolling(props: Partial<Parameters<typeof useProjectPolling>[0]> = {}) {
  const defaultProps = {
    activeFilePathRef: { current: "chapter-01.md" as string | null },
    isPollingProjectRef: { current: false },
    projectFilesRef: {
      current: [
        { relativePath: "chapter-02.md" },
        { relativePath: "chapter-01.md" },
      ] satisfies ProjectFile[],
    },
    projectSource: { kind: "tauri" as const, path: "/notes/book" },
    scanBrowserFolderForChanges: vi.fn<() => Promise<ProjectFile[]>>(),
    setProjectError: vi.fn(),
    setProjectFiles: vi.fn(),
    handleMissingActiveFile: vi.fn(),
  };
  const mergedProps = { ...defaultProps, ...props };

  renderHook(() => useProjectPolling(mergedProps));

  return mergedProps;
}

describe("useProjectPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scanProjectFolderMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls Tauri project folders and preserves manual order for existing files", async () => {
    scanProjectFolderMock.mockResolvedValueOnce([
      { relativePath: "chapter-01.md" },
      { relativePath: "chapter-02.md" },
      { relativePath: "appendix.md" },
    ]);
    const props = renderPolling();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(scanProjectFolderMock).toHaveBeenCalledWith("/notes/book");
    expect(props.projectFilesRef.current).toEqual([
      { relativePath: "chapter-02.md" },
      { relativePath: "chapter-01.md" },
      { relativePath: "appendix.md" },
    ]);
    expect(props.setProjectFiles).toHaveBeenCalledWith(props.projectFilesRef.current);
  });

  it("polls browser project folders through the provided scanner", async () => {
    const scanBrowserFolderForChanges = vi
      .fn()
      .mockResolvedValue([{ relativePath: "browser-note.md" }]);
    const props = renderPolling({
      projectSource: { kind: "browser", name: "Book", id: "browser-book" },
      projectFilesRef: { current: [] },
      scanBrowserFolderForChanges,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(scanProjectFolderMock).not.toHaveBeenCalled();
    expect(scanBrowserFolderForChanges).toHaveBeenCalled();
    expect(props.setProjectFiles).toHaveBeenCalledWith([
      { relativePath: "browser-note.md" },
    ]);
  });

  it("asks the workspace to recover when the active file disappears", async () => {
    scanProjectFolderMock.mockResolvedValueOnce([{ relativePath: "other.md" }]);
    const props = renderPolling();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(props.handleMissingActiveFile).toHaveBeenCalledWith([
      { relativePath: "other.md" },
    ]);
  });

  it("does not start a new poll while one is already running", async () => {
    const props = renderPolling({
      isPollingProjectRef: { current: true },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(scanProjectFolderMock).not.toHaveBeenCalled();
    expect(props.isPollingProjectRef.current).toBe(true);
  });

  it("does not poll when no project is open", async () => {
    renderPolling({ projectSource: null });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(scanProjectFolderMock).not.toHaveBeenCalled();
  });

  it("reports scanner failures and clears polling state", async () => {
    scanProjectFolderMock.mockRejectedValueOnce(new Error("scan failed"));
    const props = renderPolling();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(props.setProjectError).toHaveBeenCalledWith("scan failed");
    expect(props.isPollingProjectRef.current).toBe(false);
  });

  it("stringifies non-Error scanner failures", async () => {
    scanProjectFolderMock.mockRejectedValueOnce("scan failed");
    const props = renderPolling();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(props.setProjectError).toHaveBeenCalledWith("scan failed");
  });

  it("cleans up the interval when unmounted", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() =>
      useProjectPolling({
        activeFilePathRef: { current: null },
        isPollingProjectRef: { current: false },
        projectFilesRef: { current: [] },
        projectSource: { kind: "tauri", path: "/notes/book" },
        scanBrowserFolderForChanges: vi.fn(),
        handleMissingActiveFile: vi.fn(),
        setProjectError: vi.fn(),
        setProjectFiles: vi.fn(),
      }),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
