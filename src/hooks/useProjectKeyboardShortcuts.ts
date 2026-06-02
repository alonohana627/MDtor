import { useEffect } from "react";

type ValueRef<T> = {
  current: T;
};

type ProjectKeyboardShortcutsParams = {
  activeFilePathRef: ValueRef<string | null>;
  createNewFile: () => void;
  handleManualSave: () => void;
  isBusy: boolean;
  isProjectOpen: boolean;
  openProjectFolder: () => void;
  openQuickFileSwitcher: () => void;
  switchToNextFile: () => void;
};

export function useProjectKeyboardShortcuts({
  activeFilePathRef,
  createNewFile,
  handleManualSave,
  isBusy,
  isProjectOpen,
  openProjectFolder,
  openQuickFileSwitcher,
  switchToNextFile,
}: ProjectKeyboardShortcutsParams) {
  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const code = event.code;
      const isShortcutKey = (shortcutKey: string, shortcutCode: string) =>
        key === shortcutKey || code === shortcutCode;
      const isNextFileShortcut =
        isShortcutKey("tab", "Tab") ||
        (event.altKey && isShortcutKey("arrowright", "ArrowRight"));

      if (isNextFileShortcut) {
        event.preventDefault();

        if (!isBusy) {
          switchToNextFile();
        }
      } else if (isShortcutKey("s", "KeyS")) {
        event.preventDefault();

        if (!isBusy && activeFilePathRef.current) {
          handleManualSave();
        }
      } else if (isShortcutKey("o", "KeyO")) {
        event.preventDefault();

        if (!isBusy) {
          openProjectFolder();
        }
      } else if (isShortcutKey("n", "KeyN")) {
        event.preventDefault();

        if (!isBusy && isProjectOpen) {
          createNewFile();
        }
      } else if (isShortcutKey("p", "KeyP")) {
        event.preventDefault();

        if (!isBusy) {
          openQuickFileSwitcher();
        }
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [
    activeFilePathRef,
    createNewFile,
    handleManualSave,
    isBusy,
    isProjectOpen,
    openProjectFolder,
    openQuickFileSwitcher,
    switchToNextFile,
  ]);
}
