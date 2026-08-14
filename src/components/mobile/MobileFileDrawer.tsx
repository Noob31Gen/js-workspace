import React, { useState } from 'react';
import { WorkspaceNode, Workspace } from '@/lib/workspace-store';
import { FolderTree } from '@/components/layout/FolderTree';
import { Search, Layers, X, ChevronRight, Plus } from 'lucide-react';

interface MobileFileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
  onInspectNode?: (node: WorkspaceNode) => void;
  onExportNode?: (node: WorkspaceNode) => void;
  onOpenWorkspaceManager: () => void;
}

export const MobileFileDrawer: React.FC<MobileFileDrawerProps> = ({
  isOpen,
  onClose,
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
  onInspectNode,
  onExportNode,
  onOpenWorkspaceManager
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen) return null;

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const filteredNodes = (nodes || []).filter(n =>
    !filterQuery || n.name.toLowerCase().includes(filterQuery.toLowerCase()) || n.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleSelectFile = (fileId: string) => {
    onSelectFile(fileId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Touch Slide-Up Bottom Sheet Drawer */}
      <div className="relative w-full max-h-[85dvh] bg-card border-t border-border/80 rounded-t-3xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Top Drag Pill Handle */}
        <div className="w-full flex justify-center py-2 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Drawer Header Bar */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              onClick={() => { onOpenWorkspaceManager(); onClose(); }}
              className="flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-left truncate"
            >
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <div className="text-[9px] font-bold uppercase text-primary">Workspace</div>
                <div className="text-xs font-bold text-foreground truncate">{activeWorkspace?.name || 'Workspace'}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workspace files..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        </div>

        {/* Scrollable Folder Tree View */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 mobile-scroll-container">
          <FolderTree
            nodes={filteredNodes}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onToggleFolder={onToggleFolder}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            onMoveNode={onMoveNode}
            onInspectNode={(node) => {
              onInspectNode?.(node);
              onClose();
            }}
            onExportNode={(node) => {
              onExportNode?.(node);
              onClose();
            }}
            onRestoreDemo={() => { onOpenWorkspaceManager(); onClose(); }}
          />
        </div>
      </div>
    </div>
  );
};
