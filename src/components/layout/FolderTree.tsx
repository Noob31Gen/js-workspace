import React, { useState } from 'react';
import { WorkspaceNode } from '@/lib/workspace-store';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, Plus, FilePlus, FolderPlus, Trash2, Edit3, MoreVertical } from 'lucide-react';

interface FolderTreeProps {
  nodes: WorkspaceNode[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null, name: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onRestoreDemo?: () => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  nodes,
  activeFileId,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onRestoreDemo
}) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingToFolderId, setAddingToFolderId] = useState<{ parentId: string | null; type: 'file' | 'folder' } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Group nodes by parentId
  const getChildren = (parentId: string | null) => {
    return (nodes || [])
      .filter(n => n.parentId === parentId)
      .sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  };

  const handleStartRename = (node: WorkspaceNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditName(node.name);
  };

  const handleSaveRename = (nodeId: string) => {
    if (editName.trim()) {
      onRenameNode(nodeId, editName.trim());
    }
    setEditingNodeId(null);
  };

  const handleStartCreate = (parentId: string | null, type: 'file' | 'folder', e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingToFolderId({ parentId, type });
    setNewItemName('');
  };

  const handleSaveCreate = () => {
    if (addingToFolderId && newItemName.trim()) {
      if (addingToFolderId.type === 'file') {
        onCreateFile(addingToFolderId.parentId, newItemName.trim());
      } else {
        onCreateFolder(addingToFolderId.parentId, newItemName.trim());
      }
    }
    setAddingToFolderId(null);
  };

  const renderTree = (parentId: string | null = null, depth: number = 0) => {
    const children = getChildren(parentId);

    return (
      <div className="space-y-0.5" style={{ paddingLeft: depth > 0 ? `${depth * 12}px` : '0px' }}>
        {/* Inline Create Input when adding at root level */}
        {addingToFolderId && addingToFolderId.parentId === parentId && (
          <div className="flex items-center gap-1 py-1 px-2 rounded border border-primary/40 bg-primary/10">
            {addingToFolderId.type === 'folder' ? (
              <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <input
              type="text"
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCreate();
                if (e.key === 'Escape') setAddingToFolderId(null);
              }}
              onBlur={handleSaveCreate}
              placeholder={addingToFolderId.type === 'folder' ? 'Folder name...' : 'script-name.js'}
              className="w-full bg-background border border-border px-1.5 py-0.5 text-xs text-foreground font-mono rounded focus:outline-none"
            />
          </div>
        )}

        {children.map((node) => {
          const isFolder = node.type === 'folder';
          const isActive = node.id === activeFileId;
          const isExpanded = Boolean(node.expanded);

          return (
            <div key={node.id} className="group/node">
              <div
                onClick={() => {
                  if (isFolder) {
                    onToggleFolder(node.id);
                  } else {
                    onSelectFile(node.id);
                  }
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                  isActive && !isFolder
                    ? 'bg-primary/15 border-primary/40 text-primary font-bold shadow-xs'
                    : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                  {isFolder ? (
                    <span className="text-muted-foreground/70 shrink-0">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}

                  {isFolder ? (
                    isExpanded ? (
                      <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
                    )
                  ) : (
                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}

                  {editingNodeId === node.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(node.id);
                        if (e.key === 'Escape') setEditingNodeId(null);
                      }}
                      onBlur={() => handleSaveRename(node.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-background border border-primary px-1.5 py-0.5 text-xs text-foreground font-mono rounded focus:outline-none"
                    />
                  ) : (
                    <span className="truncate font-mono text-xs">{node.name}</span>
                  )}
                </div>

                {/* Node Action Buttons */}
                <div className="hidden group-hover/node:flex items-center gap-1 shrink-0 ml-2">
                  {isFolder && (
                    <>
                      <button
                        onClick={(e) => handleStartCreate(node.id, 'file', e)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="New File inside Folder"
                      >
                        <FilePlus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleStartCreate(node.id, 'folder', e)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="New Subfolder"
                      >
                        <FolderPlus className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => handleStartRename(node, e)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    title="Rename"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Render children if folder is expanded */}
              {isFolder && isExpanded && (
                <div className="mt-0.5">
                  {renderTree(node.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          <span>Files & Directories</span>
        </div>
        <div className="p-3 text-center rounded-xl border border-border/60 bg-muted/20 space-y-2">
          <p className="text-xs text-muted-foreground">Workspace has no files.</p>
          {onRestoreDemo && (
            <button
              onClick={onRestoreDemo}
              className="w-full py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
            >
              Restore Demo Workspace
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
        <span>Files & Directories</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleStartCreate(null, 'file', e)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Create File at Root"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => handleStartCreate(null, 'folder', e)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Create Folder at Root"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {renderTree(null, 0)}
    </div>
  );
};
