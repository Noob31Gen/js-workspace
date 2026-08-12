import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Workspace, WorkspaceNode } from '@/lib/workspace-store';

interface AppLayoutProps {
  children: React.ReactNode;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeFileId: string;
  nodes: WorkspaceNode[];
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null, name: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, targetParentId: string | null) => void;
  onOpenWorkspaceManager: () => void;
  onSelectDoc: (doc: string) => void;
  onImportFolder?: (fileList: FileList) => void;
  onImportZip?: (file: File) => void;
  onImportBundle?: (file: File) => void;
  onImportSingleFile?: (file: File) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  workspaces,
  activeWorkspaceId,
  activeFileId,
  nodes,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onDuplicateNode,
  onMoveNode,
  onOpenWorkspaceManager,
  onSelectDoc,
  onImportFolder,
  onImportZip,
  onImportBundle,
  onImportSingleFile
}) => {
  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col font-sans">
      <Header
        onOpenDocs={onSelectDoc}
        onImportFolder={onImportFolder}
        onImportZip={onImportZip}
        onImportBundle={onImportBundle}
        onImportSingleFile={onImportSingleFile}
      />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)]">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activeFileId={activeFileId}
          nodes={nodes}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRenameNode={onRenameNode}
          onDeleteNode={onDeleteNode}
          onDuplicateNode={onDuplicateNode}
          onMoveNode={onMoveNode}
          onOpenWorkspaceManager={onOpenWorkspaceManager}
          onOpenDocs={onSelectDoc}
          onImportFolder={onImportFolder}
          onImportZip={onImportZip}
          onImportSingleFile={onImportSingleFile}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
