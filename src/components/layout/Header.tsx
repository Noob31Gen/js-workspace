import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldAlert, Terminal, Code2, BookOpen, ExternalLink, Globe, Wifi, WifiOff, Download, Check, Sparkles, X, Upload, Folder, Archive, Layers, FileText, ChevronDown, Menu, PanelLeft } from 'lucide-react';
import { checkExtensionConnected } from '@/lib/extension-client';
import { precacheNpmPackage, getPrecachedPackages, removePrecachedPackage } from '@/lib/pwa-register';
import { ExtensionModal } from '@/components/extension/ExtensionModal';

const DEFAULT_COMMON_PACKAGES = ['lodash', 'axios', 'dayjs', 'papaparse', 'mathjs', 'cheerio'];

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
  const [customPkgInput, setCustomPkgInput] = useState<string>('');
  const [precachedPkgs, setPrecachedPkgs] = useState<string[]>(() => getPrecachedPackages());
  const [cachingPkg, setCachingPkg] = useState<string | null>(null);

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

  const handlePrecache = async (pkgName: string) => {
    setCachingPkg(pkgName);
    const success = await precacheNpmPackage(pkgName);
    setCachingPkg(null);
    if (success) {
      if (!precachedPkgs.includes(pkgName)) {
        setPrecachedPkgs(prev => [...prev, pkgName]);
      }
    } else {
      alert(`Failed to precache package "${pkgName}". Make sure internet is connected.`);
    }
  };

  const handleRemovePrecache = (pkgName: string) => {
    removePrecachedPackage(pkgName);
    setPrecachedPkgs(prev => prev.filter(p => p !== pkgName));
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
        {...({ webkitdirectory: '', directory: '' } as any)}
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
              v1.5.0 PWA
            </span>
          </h1>
          <p className="text-[10px] text-muted-foreground hidden lg:block whitespace-nowrap truncate">
            Browser Script Execution & PWA Offline Engine
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

      {/* Offline PWA Package Manager Modal - Rendered via Portal to escape header backdrop-blur containing block */}
      {isOfflineModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground font-sans">
                  Offline PWA & Package Cache
                </h3>
              </div>
              <button
                onClick={() => setIsOfflineModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                The entire app shell, editor, virtual filesystem, and Node polyfills work 100% offline.
                You can pre-download NPM packages into local CacheStorage so <code className="text-primary font-mono font-bold">require('package')</code> works offline without internet!
              </p>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Quick Pre-Cache Common Packages:
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COMMON_PACKAGES.map(pkg => (
                    <button
                      key={pkg}
                      disabled={cachingPkg === pkg}
                      onClick={() => handlePrecache(pkg)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-mono font-bold transition-all ${precachedPkgs.includes(pkg)
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-muted/50 text-foreground border-border hover:bg-primary/20 hover:border-primary'
                        }`}
                    >
                      {cachingPkg === pkg ? (
                        <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : precachedPkgs.includes(pkg) ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cached Custom Extra Packages Section */}
              {precachedPkgs.filter(pkg => !DEFAULT_COMMON_PACKAGES.includes(pkg)).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span>Cached Custom Packages ({precachedPkgs.filter(pkg => !DEFAULT_COMMON_PACKAGES.includes(pkg)).length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {precachedPkgs.filter(pkg => !DEFAULT_COMMON_PACKAGES.includes(pkg)).map(pkg => (
                      <div
                        key={pkg}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      >
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>{pkg}</span>
                        <button
                          onClick={() => handleRemovePrecache(pkg)}
                          title={`Remove ${pkg} from precached list`}
                          className="ml-0.5 p-0.5 rounded text-emerald-400/70 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Pre-cache Custom NPM Package:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. canvas-confetti, cowsay, dayjs"
                    value={customPkgInput}
                    onChange={(e) => setCustomPkgInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    disabled={!customPkgInput.trim() || cachingPkg === customPkgInput.trim()}
                    onClick={() => {
                      handlePrecache(customPkgInput.trim());
                      setCustomPkgInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50"
                  >
                    Cache
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsOfflineModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Extension Package & Status Modal */}
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
