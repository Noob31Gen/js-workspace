import React, { useState } from 'react';
import { Play, Square, Save, Check, MoreVertical, Upload, BookOpen, ShieldCheck, ShieldAlert, FileCode, Maximize2, Copy, Trash2 } from 'lucide-react';
import { WorkspaceNode } from '@/lib/workspace-store';

interface MobileHeaderProps {
  activeFile: WorkspaceNode | null;
  workspaceName: string;
  onOpenDrawer: () => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  onSaveScript: () => void;
  justSaved: boolean;
  onOpenDocs: (docName: string) => void;
  onImportClick: () => void;
  onOpenExtensionModal: () => void;
  onOpenResultWindow?: () => void;
  onDeleteActiveFile?: (fileId: string) => void;
  onDuplicateActiveFile?: (fileId: string) => void;
  extensionActive: boolean;
  isOnline: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeFile,
  workspaceName,
  onOpenDrawer,
  onRun,
  onStop,
  isRunning,
  onSaveScript,
  justSaved,
  onOpenDocs,
  onImportClick,
  onOpenExtensionModal,
  onOpenResultWindow,
  onDeleteActiveFile,
  onDuplicateActiveFile,
  extensionActive,
  isOnline
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="h-14 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-xl px-3 flex items-center justify-between z-30 select-none">
      {/* Left: Active File Picker Trigger Pill */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex items-center gap-2 max-w-[48%] flex-1 text-left p-1.5 rounded-xl border border-border/60 bg-card hover:bg-muted transition-all cursor-pointer shadow-xs min-w-0"
        aria-label="Open File Explorer Drawer"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <FileCode className="h-4 w-4" />
        </div>
        <div className="truncate min-w-0 flex-1">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {workspaceName}
          </div>
          <div className="text-xs font-bold text-foreground truncate">
            {activeFile?.name || 'Select File...'}
          </div>
        </div>
      </button>

      {/* Right: Quick Action Buttons & Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Run / Stop Button */}
        {!isRunning ? (
          <button
            type="button"
            onClick={onRun}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
            aria-label="Run Script"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold shadow-md hover:bg-destructive/90 animate-pulse transition-all cursor-pointer"
            aria-label="Stop Script Execution"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}

        {/* Action Sheet Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shadow-xs"
            title="More Options"
            aria-label="More Options Menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-border/80 bg-card p-1.5 shadow-2xl space-y-1 font-sans text-xs animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => { onSaveScript(); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center justify-between transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  {justSaved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4 text-primary" />}
                  <span>{justSaved ? 'Saved!' : 'Save Script'}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Ctrl+S</span>
              </button>

              {activeFile && onDuplicateActiveFile && (
                <button
                  type="button"
                  onClick={() => { onDuplicateActiveFile(activeFile.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors font-medium"
                >
                  <Copy className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Duplicate Active File</span>
                </button>
              )}

              {activeFile && onDeleteActiveFile && (
                <button
                  type="button"
                  onClick={() => { onDeleteActiveFile(activeFile.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 flex items-center gap-2.5 transition-colors font-bold"
                >
                  <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                  <span>Delete Active File</span>
                </button>
              )}

              {onOpenResultWindow && (
                <button
                  type="button"
                  onClick={() => { onOpenResultWindow(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-primary font-bold hover:bg-muted flex items-center gap-2.5 transition-colors border-t border-border/40 pt-2"
                >
                  <Maximize2 className="h-4 w-4 shrink-0" />
                  <span>Open Full Result Window</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { onImportClick(); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors font-medium"
              >
                <Upload className="h-4 w-4 text-primary shrink-0" />
                <span>Import Files / Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => { onOpenDocs('ARCHITECTURE.md'); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors font-medium"
              >
                <BookOpen className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Documentation</span>
              </button>

              <button
                type="button"
                onClick={() => { onOpenExtensionModal(); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center justify-between transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  {extensionActive ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  <span>CORS Helper</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  extensionActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {extensionActive ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
