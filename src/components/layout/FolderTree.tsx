import React, { useState } from 'react';
import { WorkspaceNode } from '@/lib/workspace-store';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, FilePlus, FolderPlus, Trash2, Edit3, Copy, FolderInput } from 'lucide-react';

interface FolderTreeProps {
  nodes: WorkspaceNode[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null, name: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, targetParentId: string | null) => void;
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
  onDuplicateNode,
  onMoveNode,
  onRestoreDemo
}) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingToFolderId, setAddingToFolderId] = useState<{ parentId: string | null; type: 'file' | 'folder' } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [movingNodeId, setMovingNodeId] = useState<string | null>(null);

  const getChildren = (parentId: string | null) => {
    return (nodes || [])
      .filter(n => n.parentId === parentId)
      .sort((a, b) => {
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

  const renderTree = (parentId: string | null, depth: number = 0) => {
    const children = getChildren(parentId);

    return (
      <div className="space-y-0.5" style={{ paddingLeft: depth > 0 ? '12px' : '0px' }}>
        {addingToFolderId && addingToFolderId.parentId === parentId && (
          <div className="flex items-center gap-1 py-1 px-2 rounded-md bg-muted/60 text-xs">
            {addingToFolderId.type === 'folder' ? (
              <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            ) : (
              <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <input
              type="text"
              autoFocus
              placeholder={addingToFolderId.type === 'folder' ? 'Folder Name...' : 'File Name (e.g. script.js)'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCreate();
                if (e.key === 'Escape') setAddingToFolderId(null);
              }}
              onBlur={handleSaveCreate}
              className="w-full bg-background border border-border px-1.5 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {children.map(node => {
          const isFolder = node.type === 'folder';
          const isSelected = !isFolder && node.id === activeFileId;
          const isEditing = editingNodeId === node.id;
          const isMoving = movingNodeId === node.id;
          const isExpanded = node.expanded ?? true;

          const availableFolders = (nodes || []).filter(n => n.type === 'folder' && n.id !== node.id);

          return (
            <div key={node.id} className="group/node relative">
              <div
                onClick={() => {
                  if (isFolder) {
                    onToggleFolder(node.id);
                  } else {
                    onSelectFile(node.id);
                  }
                }}
                className={`flex items-center justify-between px-2 py-1 rounded-md text-xs font-mono transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden truncate">
                  {isFolder ? (
                    <>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      )}
                    </>
                  ) : (
                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                  )}

                  {isEditing ? (
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
                      className="bg-background text-foreground border border-border px-1 py-0 rounded text-xs w-full focus:outline-none"
                    />
                  ) : (
                    <span className="truncate">{node.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover/node:opacity-100 transition-opacity">
                  {isFolder && (
                    <>
                      <button
                        onClick={(e) => handleStartCreate(node.id, 'file', e)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="Add File"
                      >
                        <FilePlus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleStartCreate(node.id, 'folder', e)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="Add Folder"
                      >
                        <FolderPlus className="h-3 w-3" />
                      </button>
                    </>
                  )}

                  {/* Duplicate / Copy Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateNode?.(node.id);
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    title="Duplicate / Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>

                  {/* Move Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingNodeId(isMoving ? null : node.id);
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    title="Move to folder..."
                  >
                    <FolderInput className="h-3 w-3" />
                  </button>

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

              {/* Move Destination Dropdown Popover */}
              {isMoving && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-7 z-40 w-44 rounded-xl border border-border/80 bg-card p-1 shadow-xl text-xs space-y-1 font-sans animate-in fade-in zoom-in duration-100"
                >
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                    Move to...
                  </div>

                  <button
                    onClick={() => {
                      onMoveNode?.(node.id, null);
                      setMovingNodeId(null);
                    }}
                    className="w-full text-left px-2 py-1 rounded text-foreground hover:bg-muted flex items-center gap-1.5"
                  >
                    <Folder className="h-3 w-3 text-primary" />
                    <span>Root Directory</span>
                  </button>

                  {availableFolders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        onMoveNode?.(node.id, folder.id);
                        setMovingNodeId(null);
                      }}
                      className="w-full text-left px-2 py-1 rounded text-foreground hover:bg-muted flex items-center gap-1.5 truncate"
                    >
                      <FolderOpen className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}

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

      {(!nodes || nodes.length === 0) ? (
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
      ) : (
        renderTree(null, 0)
      )}
    </div>
  );
};
