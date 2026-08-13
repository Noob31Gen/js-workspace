import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Workspace } from '@/lib/workspace-store';
import { FolderGit2, Plus, Download, Upload, Trash2, Check, X, Layers, Sparkles, MoreVertical } from 'lucide-react';

interface WorkspaceManagerModalProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onClose: () => void;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, description: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onImportWorkspace: (imported: Workspace) => void;
  onExportWorkspace: (id: string) => void;
}

export const WorkspaceManagerModal: React.FC<WorkspaceManagerModalProps> = ({
  workspaces,
  activeWorkspaceId,
  onClose,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onImportWorkspace,
  onExportWorkspace
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [openWsMenuId, setOpenWsMenuId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onCreateWorkspace(newWsName.trim(), newWsDesc.trim() || 'Custom user workspace');
    setNewWsName('');
    setNewWsDesc('');
    setIsCreating(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.id && json.name && Array.isArray(json.nodes)) {
          onImportWorkspace(json);
          onClose();
        } else {
          alert('Invalid workspace format');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-auto animate-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Workspace Manager</h2>
              <p className="text-xs text-muted-foreground">Manage, switch, import, or export workspaces</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {/* Action Bar: Create & Import */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Workspace</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2 px-3 rounded-xl border border-border bg-muted/40 text-foreground text-xs font-semibold hover:bg-muted transition-all flex items-center justify-center gap-1.5"
          >
            <Upload className="h-4 w-4 text-primary" />
            <span>Import JSON</span>
          </button>
        </div>

        {/* Create Workspace Form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5 animate-in fade-in duration-150">
            <div className="text-xs font-bold text-foreground">Create New Workspace</div>
            <input
              type="text"
              placeholder="Workspace Name (e.g., Data Analytics)"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Description..."
              value={newWsDesc}
              onChange={(e) => setNewWsDesc(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Workspaces List */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 relative ${
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-foreground shadow-xs'
                    : 'border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="space-y-1 overflow-hidden min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{ws.name}</span>
                    {isActive && (
                      <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-mono font-bold shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
                  <div className="text-[10px] text-muted-foreground/80 font-mono">
                    {ws.nodes.filter(n => n.type === 'file').length} Files | {ws.nodes.filter(n => n.type === 'folder').length} Folders
                  </div>
                </div>

                {/* 3-Dot Workspace Action Menu */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenWsMenuId(openWsMenuId === ws.id ? null : ws.id);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                    title={`Actions for ${ws.name}`}
                    aria-label={`Actions for ${ws.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openWsMenuId === ws.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-9 z-50 w-48 rounded-2xl border border-border/80 bg-card p-1.5 shadow-2xl space-y-1 text-xs animate-in fade-in zoom-in duration-100"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 truncate">
                        {ws.name}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectWorkspace(ws.id);
                          setOpenWsMenuId(null);
                          onClose();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-foreground hover:bg-muted flex items-center gap-2 font-medium"
                      >
                        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Switch Workspace</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onExportWorkspace(ws.id);
                          setOpenWsMenuId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-foreground hover:bg-muted flex items-center gap-2 font-medium"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span>Export JSON</span>
                      </button>

                      {workspaces.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteWorkspace(ws.id);
                            setOpenWsMenuId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-destructive hover:bg-destructive/10 flex items-center gap-2 font-bold border-t border-border/40 pt-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                          <span>Delete Workspace</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
