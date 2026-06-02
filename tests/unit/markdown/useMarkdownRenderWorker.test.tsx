import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMarkdownRenderWorker } from "../../../src/markdown/useMarkdownRenderWorker";

type WorkerMessage = {
  markdown: string;
  requestId: number;
};

class FakeMarkdownWorker {
  static instances: FakeMarkdownWorker[] = [];

  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent<{ html: string; requestId: number }>) => void) | null =
    null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    FakeMarkdownWorker.instances.push(this);
  }

  emitMessage(requestId: number, html: string) {
    this.onmessage?.({ data: { html, requestId } } as MessageEvent<{
      html: string;
      requestId: number;
    }>);
  }

  emitError() {
    this.onerror?.();
  }
}

describe("useMarkdownRenderWorker", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    FakeMarkdownWorker.instances = [];
  });

  it("renders immediately when workers are unavailable", () => {
    vi.stubGlobal("Worker", undefined);

    const { result } = renderHook(() => useMarkdownRenderWorker("# Title", 0));

    expect(result.current).toContain("Title");
  });

  it("uses worker responses, ignores stale responses, and terminates on unmount", () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeMarkdownWorker);

    const { result, rerender, unmount } = renderHook(
      ({ markdown }) => useMarkdownRenderWorker(markdown, 5),
      { initialProps: { markdown: "# Title" } },
    );

    expect(result.current).toBe("");

    act(() => {
      vi.advanceTimersByTime(5);
    });

    const worker = FakeMarkdownWorker.instances[0];
    const firstMessage = worker.postMessage.mock.calls[0][0] as WorkerMessage;

    expect(firstMessage).toEqual({ markdown: "# Title", requestId: 1 });

    act(() => {
      worker.emitMessage(0, "<p>stale</p>");
    });

    expect(result.current).toBe("");

    act(() => {
      worker.emitMessage(1, '<p onclick="alert(1)">fresh</p>');
    });

    expect(result.current).toContain("fresh");
    expect(result.current).not.toContain("onclick");

    rerender({ markdown: "## Next" });

    act(() => {
      vi.advanceTimersByTime(5);
    });

    expect(FakeMarkdownWorker.instances).toHaveLength(1);
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      markdown: "## Next",
      requestId: 2,
    });

    unmount();

    expect(worker.terminate).toHaveBeenCalled();
  });

  it("falls back to main-thread rendering when worker creation or rendering fails", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("worker blocked");
        }
      },
    );

    const throwingWorkerHook = renderHook(() => useMarkdownRenderWorker("# Fallback", 5));

    act(() => {
      vi.advanceTimersByTime(5);
    });

    expect(throwingWorkerHook.result.current).toContain("Fallback");

    throwingWorkerHook.unmount();
    FakeMarkdownWorker.instances = [];
    vi.stubGlobal("Worker", FakeMarkdownWorker);

    const { result } = renderHook(() => useMarkdownRenderWorker("# Error", 5));

    act(() => {
      vi.advanceTimersByTime(5);
    });

    const worker = FakeMarkdownWorker.instances[0];

    act(() => {
      worker.emitError();
    });

    expect(worker.terminate).toHaveBeenCalled();
    expect(result.current).toContain("Error");
  });
});
