import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, bench, describe, vi } from "vitest";
import { useProjectKeyboardShortcuts } from "../../src/hooks/useProjectKeyboardShortcuts";

function ShortcutHarness({
  isBusy = false,
  isProjectOpen = true,
}: {
  isBusy?: boolean;
  isProjectOpen?: boolean;
}) {
  useProjectKeyboardShortcuts({
    activeFilePathRef: { current: "docs/file.md" },
    createNewFile: vi.fn(),
    handleManualSave: vi.fn(),
    isBusy,
    isProjectOpen,
    openProjectFolder: vi.fn(),
    openQuickFileSwitcher: vi.fn(),
    switchToNextFile: vi.fn(),
  });

  return null;
}

let roots: Root[] = [];
let containers: HTMLDivElement[] = [];

function renderShortcutHook(isBusy = false, isProjectOpen = true) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  flushSync(() => {
    root.render(<ShortcutHarness isBusy={isBusy} isProjectOpen={isProjectOpen} />);
  });
}

function dispatchShortcut(key: string, options: KeyboardEventInit = {}) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );
}

afterEach(() => {
  for (const root of roots) {
    root.unmount();
  }

  for (const container of containers) {
    container.remove();
  }

  roots = [];
  containers = [];
});

describe("useProjectKeyboardShortcuts setup", () => {
  bench("mount shortcut hook", () => {
    renderShortcutHook();
  });

  bench("mount shortcut hook while busy", () => {
    renderShortcutHook(true);
  });

  bench("mount shortcut hook without open project", () => {
    renderShortcutHook(false, false);
  });
});

describe("useProjectKeyboardShortcuts dispatch", () => {
  bench("dispatch save shortcut", () => {
    renderShortcutHook();
    dispatchShortcut("s");
  });

  bench("dispatch open project shortcut", () => {
    renderShortcutHook();
    dispatchShortcut("o");
  });

  bench("dispatch new file shortcut", () => {
    renderShortcutHook();
    dispatchShortcut("n");
  });

  bench("dispatch quick switcher shortcut", () => {
    renderShortcutHook();
    dispatchShortcut("p");
  });

  bench("dispatch next file tab shortcut", () => {
    renderShortcutHook();
    dispatchShortcut("Tab");
  });

  bench("dispatch next file alt arrow shortcut", () => {
    renderShortcutHook();
    dispatchShortcut("ArrowRight", {
      altKey: true,
    });
  });
});
