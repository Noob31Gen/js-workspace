import React, { useState, useRef } from 'react';
import { WorkspaceNode } from '@/lib/workspace-store';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, Plus, FilePlus, FolderPlus, Trash2, Edit3, Upload, Archive, FileText } from 'lucide-react';

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
  onImportFolder?: (fileList: FileList) => void;
  onImportZip?: (file: File) => void;
  onImportSingleFile?: (file: File) => void;
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
  onRestoreDemo,
  onImportFolder,
  onImportZip,
  onImportSingleFile
}) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingToFolderId, setAddingToFolderId] = useState<{ parentId: string | null; type: 'file' | 'folder' } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showImportMenu, setShowImportMenu] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group nodes by parentId
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

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportFolder) {
      onImportFolder(e.target.files);
    }
    setShowImportMenu(false);
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportZip) {
      onImportZip(e.target.files[0]);
    }
    setShowImportMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportSingleFile) {
      onImportSingleFile(e.target.files[0]);
    }
    setShowImportMenu(false);
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
          const isExpanded = node.expanded ?? true;

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
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={zipInputRef}
        onChange={handleZipChange}
        accept=".zip"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="*"
        className="hidden"
      />

      <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
        <span>Files & Directories</span>
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-all flex items-center gap-1 text-[10px]"
            title="Import PC Folder, ZIP, or File"
          >
            <Upload className="h-3 w-3" />
            <span>Import</span>
          </button>

          {showImportMenu && (
            <div className="absolute right-0 top-6 z-40 w-48 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl space-y-1 font-sans text-xs">
              <button
                onClick={() => folderInputRef.current?.click()}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2"
              >
                <Folder className="h-3.5 w-3.5 text-amber-400" />
                Import PC Folder (New WS)
              </button>
              <button
                onClick={() => zipInputRef.current?.click()}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2"
              >
                <Archive className="h-3.5 w-3.5 text-blue-400" />
                Import ZIP Archive (New WS)
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2 border-t border-border/40 pt-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                Import File (Active WS)
              </button>
            </div>
          )}

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
