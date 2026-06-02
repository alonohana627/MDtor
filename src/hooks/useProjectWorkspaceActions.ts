import { useWorkspaceActionRunner } from "./workspaceActions/actionRunner";
import { useWorkspaceFileActions } from "./workspaceActions/fileActions";
import { useWorkspaceFolderActions } from "./workspaceActions/folderActions";
import { useWorkspaceProjectActions } from "./workspaceActions/projectActions";
import { useWorkspaceSyncActions } from "./workspaceActions/syncActions";
import { type WorkspaceActionsParams } from "./workspaceActions/types";

export function useProjectWorkspaceActions(params: WorkspaceActionsParams) {
  const runBusyProjectAction = useWorkspaceActionRunner(params);
  const syncActions = useWorkspaceSyncActions(params);
  const fileActions = useWorkspaceFileActions({
    params,
    runBusyProjectAction,
    saveActiveDocument: syncActions.saveActiveDocument,
  });
  const projectActions = useWorkspaceProjectActions({
    params,
    handleMissingActiveFile: syncActions.handleMissingActiveFile,
    runBusyProjectAction,
    saveActiveDocument: syncActions.saveActiveDocument,
    scanCurrentProjectFiles: syncActions.scanCurrentProjectFiles,
  });
  const folderActions = useWorkspaceFolderActions({
    params,
    createFileAtPath: fileActions.createFileAtPath,
    handleMissingActiveFile: syncActions.handleMissingActiveFile,
    runBusyProjectAction,
    scanCurrentProjectFiles: syncActions.scanCurrentProjectFiles,
  });

  return {
    createNewFile: fileActions.createNewFile,
    createNewFolder: folderActions.createNewFolder,
    deleteFile: fileActions.deleteFile,
    deleteFolder: folderActions.deleteFolder,
    handleManualSave: projectActions.handleManualSave,
    handleMissingActiveFile: syncActions.handleMissingActiveFile,
    moveProjectFile: fileActions.moveProjectFile,
    openProjectFolder: projectActions.openProjectFolder,
    openQuickFileSwitcher: fileActions.openQuickFileSwitcher,
    openRecentProject: projectActions.openRecentProject,
    refreshProject: projectActions.refreshProject,
    renameFile: fileActions.renameFile,
    renameFolder: folderActions.renameFolder,
    revealFile: projectActions.revealFile,
    saveActiveDocument: syncActions.saveActiveDocument,
    scanBrowserFolderForChanges: syncActions.scanBrowserFolderForChanges,
    switchFile: fileActions.switchFile,
    switchToNextFile: fileActions.switchToNextFile,
  };
}
