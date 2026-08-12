import React, { useState } from 'react';
import { WorkspaceNode, Workspace } from '@/lib/workspace-store';
import { FolderTree } from './FolderTree';
import { Layers, Search, BookOpen, FileText, Sparkles, Settings, Plus, ChevronDown } from 'lucide-react';

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
  onOpenWorkspaceManager,
  onOpenDocs
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const filteredNodes = (nodes || []).filter(n =>
    !filterQuery || n.name.toLowerCase().includes(filterQuery.toLowerCase()) || n.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <aside className="w-64 shrink-0 border-r border-border/60 bg-card/40 p-3.5 flex flex-col justify-between h-full max-h-full overflow-hidden">
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
            onRestoreDemo={onOpenWorkspaceManager}
          />
        </div>

        {/* Technical Documentation Section */}
        <div className="space-y-1.5 pt-3 border-t border-border/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Documentation
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onOpenDocs('ARCHITECTURE.md')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5" />
              Architecture Specs
            </button>
            <button
              onClick={() => onOpenDocs('SCRIPT_SPECIFICATION.md')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Option & JSDoc Guide
            </button>
            <button
              onClick={() => onOpenDocs('EXTENSION_INTEGRATION.md')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center gap-2"
            >
              <Settings className="h-3.5 w-3.5" />
              CORS Extension Bridge
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-border/40 text-[10px] text-muted-foreground/70 flex items-center justify-between font-mono">
        <span>Noob31 JS Sandbox</span>
        <span>React 19 + Vite</span>
      </div>
    </aside>
  );
};
