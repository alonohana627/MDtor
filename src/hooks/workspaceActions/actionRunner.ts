import { useCallback } from "react";
import { toProjectErrorMessage } from "../useProjectWorkspaceHelpers";
import { type BusyProjectActionRunner, type WorkspaceActionsParams } from "./types";

export function useWorkspaceActionRunner({
  setIsBusy,
  setProjectError,
}: Pick<WorkspaceActionsParams, "setIsBusy" | "setProjectError">) {
  return useCallback<BusyProjectActionRunner>(
    async (action) => {
      setIsBusy(true);
      setProjectError(null);

      try {
        await action();
      } catch (error) {
        setProjectError(toProjectErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [setIsBusy, setProjectError],
  );
}
