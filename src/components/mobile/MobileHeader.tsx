import React, { useState, useRef } from 'react';
import { Play, Square, Save, Check, MoreVertical, Upload, BookOpen, ShieldCheck, ShieldAlert, FileCode, Maximize2, Copy, Trash2, AlertTriangle, ExternalLink, Wifi, WifiOff, Folder, Archive, Layers, Download, FileText, ChevronRight } from 'lucide-react';
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
  onOpenExtensionModal: () => void;
  onOpenOfflineModal?: () => void;
  onOpenResultWindow?: () => void;
  onDeleteActiveFile?: (fileId: string) => void;
  onDuplicateActiveFile?: (fileId: string) => void;
  onImportFolder?: (fileList: FileList) => void;
  onImportZip?: (file: File) => void;
  onImportBundle?: (file: File) => void;
  onImportSingleFile?: (file: File) => void;
  onExportActiveWorkspace?: () => void;
  extensionActive: boolean;
  isOnline: boolean;
  inputPrompt?: string | null;
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
  onOpenExtensionModal,
  onOpenOfflineModal,
  onOpenResultWindow,
  onDeleteActiveFile,
  onDuplicateActiveFile,
  onImportFolder,
  onImportZip,
  onImportBundle,
  onImportSingleFile,
  onExportActiveWorkspace,
  extensionActive,
  isOnline,
  inputPrompt
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showImportSubMenu, setShowImportSubMenu] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportFolder) {
      onImportFolder(e.target.files);
    }
    setShowMenu(false);
    setShowImportSubMenu(false);
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportZip) {
      onImportZip(e.target.files[0]);
    }
    setShowMenu(false);
    setShowImportSubMenu(false);
  };

  const handleBundleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportBundle) {
      onImportBundle(e.target.files[0]);
    }
    setShowMenu(false);
    setShowImportSubMenu(false);
  };

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportSingleFile) {
      onImportSingleFile(e.target.files[0]);
    }
    setShowMenu(false);
    setShowImportSubMenu(false);
  };

  return (
    <header className="h-14 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-xl px-3 flex items-center justify-between z-30 select-none">
      {/* Hidden File Inputs for Mobile */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        style={{ display: 'none' }}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
      />
      <input
        type="file"
        ref={zipInputRef}
        onChange={handleZipChange}
        accept=".zip"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={bundleInputRef}
        onChange={handleBundleChange}
        accept=".json"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSingleFileChange}
        style={{ display: 'none' }}
        multiple
      />

      {/* Left: Active File Picker Trigger Pill */}
      <div className="flex items-center gap-1.5 max-w-[55%] min-w-0">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center gap-2 flex-1 text-left p-1.5 rounded-xl border border-border/60 bg-card hover:bg-muted transition-all cursor-pointer shadow-xs min-w-0"
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

        {inputPrompt && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-1.5 py-1 text-[10px] font-mono font-bold text-amber-300 animate-pulse shrink-0">
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">Input</span>
          </span>
        )}
      </div>

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
            onClick={() => {
              setShowMenu(!showMenu);
              setShowImportSubMenu(false);
            }}
            className="p-2 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shadow-xs"
            title="More Options"
            aria-label="More Options Menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-11 z-50 w-64 max-h-[80vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-1.5 shadow-2xl space-y-1 font-sans text-xs animate-in fade-in zoom-in duration-150">
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

              {/* Import & Export Sub-Menu Trigger */}
              <div className="border-t border-border/40 pt-1">
                <button
                  type="button"
                  onClick={() => setShowImportSubMenu(!showImportSubMenu)}
                  className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center justify-between transition-colors font-bold"
                >
                  <div className="flex items-center gap-2.5">
                    <Upload className="h-4 w-4 text-primary shrink-0" />
                    <span>Import / Export Files</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showImportSubMenu ? 'rotate-90' : ''}`} />
                </button>

                {showImportSubMenu && (
                  <div className="pl-3 pr-1 py-1 space-y-1 bg-muted/30 rounded-xl my-1 border border-border/30">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Data File / Attachment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>Device / PC Folder</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => zipInputRef.current?.click()}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <Archive className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>ZIP Archive (.zip)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => bundleInputRef.current?.click()}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <Layers className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span>Workspace Bundle (.json)</span>
                    </button>

                    {onExportActiveWorkspace && (
                      <button
                        type="button"
                        onClick={() => { onExportActiveWorkspace(); setShowMenu(false); setShowImportSubMenu(false); }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-primary font-bold hover:bg-primary/10 flex items-center gap-2 transition-colors text-[11px] border-t border-border/40 pt-1.5"
                      >
                        <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Export Workspace (.json)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Node Package Caching Option */}
              {onOpenOfflineModal && (
                <button
                  type="button"
                  onClick={() => { onOpenOfflineModal(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center justify-between transition-colors font-medium border-t border-border/40 pt-2"
                >
                  <div className="flex items-center gap-2.5">
                    {isOnline ? (
                      <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span>Node Dependency Cache</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isOnline ? 'PWA Ready' : 'Offline'}
                  </span>
                </button>
              )}

              {/* CORS Helper */}
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

              <button
                type="button"
                onClick={() => { onOpenDocs('ARCHITECTURE.md'); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors font-medium border-t border-border/40 pt-2"
              >
                <BookOpen className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Documentation</span>
              </button>

              <a
                href="https://github.com/Noob31Gen/js-workspace"
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowMenu(false)}
                className="w-full text-left px-3 py-2 rounded-xl text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors font-medium"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <span>GitHub Repository</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
