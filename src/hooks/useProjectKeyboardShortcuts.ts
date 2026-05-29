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

      if (key === "tab") {
        event.preventDefault();

        if (!isBusy) {
          switchToNextFile();
        }
      } else if (key === "s") {
        event.preventDefault();

        if (!isBusy && activeFilePathRef.current) {
          handleManualSave();
        }
      } else if (key === "o") {
        event.preventDefault();

        if (!isBusy) {
          openProjectFolder();
        }
      } else if (key === "n") {
        event.preventDefault();

        if (!isBusy && isProjectOpen) {
          createNewFile();
        }
      } else if (key === "p") {
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
