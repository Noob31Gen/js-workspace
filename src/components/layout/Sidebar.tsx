import React, { useState } from 'react';
import { WorkspaceNode, Workspace } from '@/lib/workspace-store';
import { FolderTree } from './FolderTree';
import { Layers, Search, ChevronDown } from 'lucide-react';

interface SidebarProps {
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
  onOpenDocs: (doc: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
  onOpenWorkspaceManager
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const filteredNodes = (nodes || []).filter(n =>
    !filterQuery || n.name.toLowerCase().includes(filterQuery.toLowerCase()) || n.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-border/60 bg-card/40 p-3.5 flex flex-col justify-between h-full max-h-full overflow-hidden select-none">
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
        {/* Active Workspace Selector Banner */}
        <div
          onClick={onOpenWorkspaceManager}
          className="p-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 transition-all cursor-pointer flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Active Workspace</div>
              <div className="text-xs font-bold text-foreground truncate">{activeWorkspace?.name || 'Workspace'}</div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workspace files..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* Nested Folder Tree Explorer */}
        <div className="space-y-2">
          <FolderTree
            nodes={filteredNodes}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
            onToggleFolder={onToggleFolder}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            onMoveNode={onMoveNode}
            onRestoreDemo={onOpenWorkspaceManager}
          />
        </div>
      </div>
    </aside>
  );
};
