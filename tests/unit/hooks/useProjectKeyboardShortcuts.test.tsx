import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProjectKeyboardShortcuts } from "../../../src/hooks/useProjectKeyboardShortcuts";

function renderShortcuts(
  props: Partial<Parameters<typeof useProjectKeyboardShortcuts>[0]> = {},
) {
  const defaultProps = {
    activeFilePathRef: { current: "chapter.md" },
    createNewFile: vi.fn(),
    handleManualSave: vi.fn(),
    isBusy: false,
    isProjectOpen: true,
    openProjectFolder: vi.fn(),
    openQuickFileSwitcher: vi.fn(),
    switchToNextFile: vi.fn(),
  };
  const mergedProps = { ...defaultProps, ...props };

  renderHook(() => useProjectKeyboardShortcuts(mergedProps));

  return mergedProps;
}

describe("useProjectKeyboardShortcuts", () => {
  it("dispatches project shortcuts for Ctrl key combinations", () => {
    const props = renderShortcuts();

    fireEvent.keyDown(window, { key: "s", code: "KeyS", ctrlKey: true });
    fireEvent.keyDown(window, { key: "o", code: "KeyO", ctrlKey: true });
    fireEvent.keyDown(window, { key: "n", code: "KeyN", ctrlKey: true });
    fireEvent.keyDown(window, { key: "p", code: "KeyP", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Tab", code: "Tab", ctrlKey: true });
    fireEvent.keyDown(window, {
      key: "ArrowRight",
      code: "ArrowRight",
      ctrlKey: true,
      altKey: true,
    });

    expect(props.handleManualSave).toHaveBeenCalledTimes(1);
    expect(props.openProjectFolder).toHaveBeenCalledTimes(1);
    expect(props.createNewFile).toHaveBeenCalledTimes(1);
    expect(props.openQuickFileSwitcher).toHaveBeenCalledTimes(1);
    expect(props.switchToNextFile).toHaveBeenCalledTimes(2);
  });

  it("dispatches project shortcuts by physical key on non-Latin layouts", () => {
    const props = renderShortcuts();

    fireEvent.keyDown(window, { key: "ד", code: "KeyS", ctrlKey: true });
    fireEvent.keyDown(window, { key: "ם", code: "KeyO", ctrlKey: true });
    fireEvent.keyDown(window, { key: "מ", code: "KeyN", ctrlKey: true });
    fireEvent.keyDown(window, { key: "פ", code: "KeyP", ctrlKey: true });

    expect(props.handleManualSave).toHaveBeenCalledTimes(1);
    expect(props.openProjectFolder).toHaveBeenCalledTimes(1);
    expect(props.createNewFile).toHaveBeenCalledTimes(1);
    expect(props.openQuickFileSwitcher).toHaveBeenCalledTimes(1);
  });

  it("dispatches project shortcuts for Cmd key combinations", () => {
    const props = renderShortcuts();

    fireEvent.keyDown(window, { key: "S", code: "KeyS", metaKey: true });
    fireEvent.keyDown(window, { key: "Tab", code: "Tab", metaKey: true });
    fireEvent.keyDown(window, {
      key: "ArrowRight",
      code: "ArrowRight",
      metaKey: true,
      altKey: true,
    });

    expect(props.handleManualSave).toHaveBeenCalledTimes(1);
    expect(props.switchToNextFile).toHaveBeenCalledTimes(2);
  });

  it("does not run file actions while busy or without an open project", () => {
    const props = renderShortcuts({
      activeFilePathRef: { current: null },
      isBusy: true,
      isProjectOpen: false,
    });

    fireEvent.keyDown(window, { key: "s", code: "KeyS", ctrlKey: true });
    fireEvent.keyDown(window, { key: "o", code: "KeyO", ctrlKey: true });
    fireEvent.keyDown(window, { key: "n", code: "KeyN", ctrlKey: true });
    fireEvent.keyDown(window, { key: "p", code: "KeyP", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Tab", code: "Tab", ctrlKey: true });

    expect(props.handleManualSave).not.toHaveBeenCalled();
    expect(props.openProjectFolder).not.toHaveBeenCalled();
    expect(props.createNewFile).not.toHaveBeenCalled();
    expect(props.openQuickFileSwitcher).not.toHaveBeenCalled();
    expect(props.switchToNextFile).not.toHaveBeenCalled();
  });

  it("ignores unmodified key presses", () => {
    const props = renderShortcuts();

    fireEvent.keyDown(window, { key: "s" });

    expect(props.handleManualSave).not.toHaveBeenCalled();
  });
});
