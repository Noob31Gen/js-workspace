import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, ShieldAlert, Terminal, Code2, BookOpen, ExternalLink, Wifi, WifiOff, Download, X, Upload, Folder, Archive, Layers, FileText, ChevronDown, Menu, PanelLeft } from 'lucide-react';
import { checkExtensionConnected } from '@/lib/extension-client';
import { ExtensionModal } from '@/components/extension/ExtensionModal';
import { OfflinePackageModal } from '@/components/pwa/OfflinePackageModal';
import packageJson from '../../../package.json';

interface HeaderProps {
  onOpenDocs: (docName: string) => void;
  onImportFolder?: (fileList: FileList) => void;
  onImportZip?: (file: File) => void;
  onImportBundle?: (file: File) => void;
  onImportSingleFile?: (file: File) => void;
  onExportActiveWorkspace?: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDocs,
  onImportFolder,
  onImportZip,
  onImportBundle,
  onImportSingleFile,
  onExportActiveWorkspace,
  onToggleMobileSidebar,
  onToggleSidebar,
  isMobileSidebarOpen,
  isSidebarOpen = true
}) => {
  const [extensionActive, setExtensionActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);
  const [showImportMenu, setShowImportMenu] = useState<boolean>(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verifyExtension = async () => {
      const active = await checkExtensionConnected();
      setExtensionActive(active);
    };

    verifyExtension();
    const interval = setInterval(verifyExtension, 5000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const handleBundleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportBundle) {
      onImportBundle(e.target.files[0]);
    }
    setShowImportMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportSingleFile) {
      onImportSingleFile(e.target.files[0]);
    }
    setShowImportMenu(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        {...({ webkitdirectory: '', directory: '' } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        className="hidden"
        aria-label="Import PC Folder Input"
      />
      <input
        type="file"
        ref={zipInputRef}
        onChange={handleZipChange}
        accept=".zip"
        className="hidden"
        aria-label="Import ZIP Archive Input"
      />
      <input
        type="file"
        ref={bundleInputRef}
        onChange={handleBundleChange}
        accept=".json"
        className="hidden"
        aria-label="Import Workspace Bundle Input"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="*"
        className="hidden"
        aria-label="Import Single Data File Input"
      />

      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        {/* Universal Sidebar Toggle (Desktop & Mobile) */}
        <button
          type="button"
          onClick={onToggleSidebar || onToggleMobileSidebar}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted transition-all cursor-pointer shadow-xs shrink-0"
          title={isSidebarOpen ? 'Collapse Sidebar (Ctrl+B)' : 'Expand Sidebar (Ctrl+B)'}
          aria-label={isSidebarOpen ? 'Collapse Navigation Sidebar' : 'Expand Navigation Sidebar'}
        >
          <PanelLeft className={`h-4 w-4 text-primary transition-transform duration-200 ${isSidebarOpen ? '' : 'rotate-180'}`} />
        </button>

        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-foreground hover:bg-muted transition-all shrink-0"
          title={isMobileSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          aria-label={isMobileSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 animate-rainbow-glow shrink-0"
          title="JS Workspace Platform Logo"
          aria-label="JS Workspace Platform Logo"
        >
          <Terminal className="h-5 w-5" />
        </div>
        <div className="shrink-0 min-w-0">
          <h1 className="text-lg sm:text-xl font-brand font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text flex items-center gap-2 whitespace-nowrap">
            <span>JS Workspace.</span>
            <span className="hidden md:inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-sans font-medium text-muted-foreground border border-border/60 whitespace-nowrap shrink-0">
              v{packageJson.version}
            </span>
          </h1>
          <p className="text-[10px] text-muted-foreground hidden lg:block whitespace-nowrap truncate">
            Browser Script Execution & Virtual File System Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Unified Import Button Outside Editor */}
        <div className="relative">
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-xs"
            title="Import PC Folders, ZIP Archives, or Workspace Files"
            aria-label="Import PC Folders, ZIP Archives, or Workspace Files"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
            <ChevronDown className="h-3 w-3 opacity-80" />
          </button>

          {showImportMenu && (
            <div className="absolute right-0 top-10 z-50 w-60 rounded-xl border border-border/80 bg-card p-1.5 shadow-2xl space-y-1 font-sans text-xs animate-in fade-in zoom-in duration-150">
              <button
                onClick={() => { folderInputRef.current?.click(); setShowImportMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors"
                title="Import local PC folder to create new workspace"
                aria-label="Import PC Folder to create new workspace"
              >
                <Folder className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">PC Folder</div>
                  <div className="text-[10px] text-muted-foreground">Creates new workspace</div>
                </div>
              </button>

              <button
                onClick={() => { zipInputRef.current?.click(); setShowImportMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors"
                title="Import ZIP archive (.zip) to create new workspace"
                aria-label="Import ZIP Archive (.zip) to create new workspace"
              >
                <Archive className="h-4 w-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold">ZIP Archive (.zip)</div>
                  <div className="text-[10px] text-muted-foreground">Creates new workspace</div>
                </div>
              </button>

              <button
                onClick={() => { bundleInputRef.current?.click(); setShowImportMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors"
                title="Import JSON workspace bundle file"
                aria-label="Import Workspace Bundle (.json)"
              >
                <Layers className="h-4 w-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-bold">Workspace Bundle (.json)</div>
                  <div className="text-[10px] text-muted-foreground">Creates new workspace</div>
                </div>
              </button>

              <button
                onClick={() => { fileInputRef.current?.click(); setShowImportMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-foreground hover:bg-muted flex items-center gap-2.5 transition-colors border-t border-border/40 pt-2"
                title="Import single file into current active workspace"
                aria-label="Import Single Data File into current active workspace"
              >
                <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Single Data File</div>
                  <div className="text-[10px] text-muted-foreground">Drops into active workspace</div>
                </div>
              </button>

              {onExportActiveWorkspace && (
                <button
                  onClick={() => { onExportActiveWorkspace(); setShowImportMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-primary font-bold hover:bg-primary/10 flex items-center gap-2.5 transition-colors border-t border-border/40 pt-2"
                  title="Export active workspace as JSON bundle file"
                  aria-label="Export Active Workspace as JSON bundle"
                >
                  <Download className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="font-bold">Export Workspace (.json)</div>
                    <div className="text-[10px] text-muted-foreground">Downloads active workspace</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Offline / Online Status Badge */}
        <button
          onClick={() => setIsOfflineModalOpen(true)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2 sm:px-3 text-xs font-semibold transition-all cursor-pointer shadow-xs ${isOnline
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          title="Click to manage offline PWA packages"
          aria-label={isOnline ? 'PWA Ready (Online) - Manage offline PWA package cache' : 'Offline Mode - Manage offline PWA package cache'}
        >
          {isOnline ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">PWA Ready (Online)</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Offline Mode</span>
            </>
          )}
        </button>

        {/* Extension Connection Status Badge */}
        <button
          onClick={() => setIsExtensionModalOpen(true)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2 sm:px-3 text-xs font-semibold transition-all shadow-xs cursor-pointer ${extensionActive
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          title="Click to download helper extension or check connection"
          aria-label={extensionActive ? 'CORS Helper Extension Connected' : 'CORS Helper Extension Inactive - Click to install helper'}
        >
          {extensionActive ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="hidden lg:inline">CORS Helper Connected</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="hidden lg:inline">CORS Helper Inactive</span>
            </>
          )}
        </button>

        {/* Documentation Button */}
        <button
          onClick={() => onOpenDocs('ARCHITECTURE.md')}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-2 sm:px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer shadow-xs"
          title="In-page Documentation"
          aria-label="Open In-page Documentation"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">Docs</span>
        </button>

        <a
          href="https://github.com/Noob31Gen/js-workspace"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer shadow-xs"
          title="View JS Workspace repository on GitHub"
          aria-label="Open JS Workspace repository on GitHub"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>GitHub</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>

      {/* Offline PWA Package Manager Modal */}
      <OfflinePackageModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
      />

      {/* Extension Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        extensionActive={extensionActive}
        onClose={() => setIsExtensionModalOpen(false)}
        onRefreshStatus={async () => {
          const active = await checkExtensionConnected();
          setExtensionActive(active);
        }}
      />
    </header>
  );
};
