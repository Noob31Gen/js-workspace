import React, { useState } from 'react';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleMobileSelectFile = (fileId: string) => {
    onSelectFile(fileId);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-background text-foreground flex flex-col font-sans select-none">
      <Header
        onOpenDocs={onSelectDoc}
        onImportFolder={onImportFolder}
        onImportZip={onImportZip}
        onImportBundle={onImportBundle}
        onImportSingleFile={onImportSingleFile}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden h-[calc(100dvh-4rem)] relative">
        {/* Desktop Sidebar (hidden on mobile md:block) */}
        <div className="hidden md:block h-full">
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
          />
        </div>

        {/* Mobile Slide-Over Sidebar Drawer */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-72 max-w-[80vw] h-full bg-card border-r border-border/80 z-50 shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col">
              <Sidebar
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                activeFileId={activeFileId}
                nodes={nodes}
                onSelectFile={handleMobileSelectFile}
                onToggleFolder={onToggleFolder}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRenameNode={onRenameNode}
                onDeleteNode={onDeleteNode}
                onDuplicateNode={onDuplicateNode}
                onMoveNode={onMoveNode}
                onOpenWorkspaceManager={() => {
                  onOpenWorkspaceManager();
                  setIsMobileSidebarOpen(false);
                }}
                onOpenDocs={(doc) => {
                  onSelectDoc(doc);
                  setIsMobileSidebarOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Main Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 mobile-scroll-container">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
