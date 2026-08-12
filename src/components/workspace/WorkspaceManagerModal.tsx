import React, { useState, useRef } from 'react';
import { Workspace } from '@/lib/workspace-store';
import { FolderGit2, Plus, Download, Upload, Trash2, Check, X, Layers, Sparkles } from 'lucide-react';

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
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWsName.trim()) {
      onCreateWorkspace(newWsName.trim(), newWsDesc.trim() || 'Custom script workspace');
      setNewWsName('');
      setNewWsDesc('');
      setIsCreating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.nodes && parsed.name) {
          onImportWorkspace(parsed);
          onClose();
        } else {
          alert('Invalid Workspace JSON file format.');
        }
      } catch (err) {
        alert('Failed to parse Workspace JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Workspace Manager
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage multi-folder projects, cross-script dependencies & workspace bundles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreating(prev => !prev)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
          >
            <Upload className="h-4 w-4 text-primary" />
            Import Bundle
          </button>

          <button
            onClick={() => onExportWorkspace(activeWorkspaceId)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Export Active
          </button>
        </div>

        {/* Inline Creation Form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Create New Workspace</h4>
            <input
              type="text"
              placeholder="Workspace Name (e.g. Network Suite)"
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
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-foreground shadow-xs'
                    : 'border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{ws.name}</span>
                    {isActive && (
                      <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-mono font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
                  <div className="text-[10px] text-muted-foreground/80 font-mono">
                    {ws.nodes.filter(n => n.type === 'file').length} Files | {ws.nodes.filter(n => n.type === 'folder').length} Folders
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {workspaces.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWorkspace(ws.id);
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete Workspace"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
