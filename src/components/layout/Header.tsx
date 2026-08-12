import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldAlert, Terminal, Code2, BookOpen, ExternalLink, Globe, Wifi, WifiOff, Download, Check, Sparkles, X, Upload, Folder, Archive, Layers, FileText, ChevronDown } from 'lucide-react';
import { checkExtensionConnected } from '@/lib/extension-client';
import { precacheNpmPackage } from '@/lib/pwa-register';
import { ExtensionModal } from '@/components/extension/ExtensionModal';

interface HeaderProps {
  onOpenDocs: (docName: string) => void;
  onImportFolder?: (fileList: FileList) => void;
  onImportZip?: (file: File) => void;
  onImportBundle?: (file: File) => void;
  onImportSingleFile?: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDocs,
  onImportFolder,
  onImportZip,
  onImportBundle,
  onImportSingleFile
}) => {
  const [extensionActive, setExtensionActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);
  const [showImportMenu, setShowImportMenu] = useState<boolean>(false);
  const [customPkgInput, setCustomPkgInput] = useState<string>('');
  const [precachedPkgs, setPrecachedPkgs] = useState<string[]>(['lodash', 'dayjs', 'papaparse']);
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
        ref={bundleInputRef}
        onChange={handleBundleChange}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="*"
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 animate-rainbow-glow">
          <Terminal className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-brand font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text flex items-center gap-2">
            JS Workspace.
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-sans font-medium text-muted-foreground border border-border/60">
              v1.0 Offline PWA
            </span>
          </h1>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Browser Script Execution, Node Modules & PWA Offline Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Unified Import Button Outside Editor */}
        <div className="relative">
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-xs"
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
              >
                <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Single Data File</div>
                  <div className="text-[10px] text-muted-foreground">Drops into active workspace</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Offline / Online Status Badge */}
        <button
          onClick={() => setIsOfflineModalOpen(true)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
          }`}
          title="Click to manage offline PWA packages"
        >
          {isOnline ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">PWA Ready (Online)</span>
              <span className="sm:hidden">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              <span>Offline Mode</span>
            </>
          )}
        </button>

        {/* Extension Connection Status Badge (Clickable to open download modal) */}
        <button
          onClick={() => setIsExtensionModalOpen(true)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all shadow-xs cursor-pointer ${
            extensionActive 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
          }`}
          title="Click to download helper extension or check connection"
        >
          {extensionActive ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden lg:inline">CORS Helper Connected</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden lg:inline">CORS Helper Inactive</span>
            </>
          )}
        </button>

        {/* Documentation Button */}
        <button
          onClick={() => onOpenDocs('ARCHITECTURE.md')}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer shadow-xs"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Docs</span>
        </button>

        <a
          href="https://noob31.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer shadow-xs"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden md:inline">My Website</span>
        </a>

        <a
          href="https://github.com/Noob31Gen/noob31-multitool"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer shadow-xs"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">GitHub</span>
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
                  {['lodash', 'axios', 'dayjs', 'papaparse', 'mathjs', 'cheerio'].map(pkg => (
                    <button
                      key={pkg}
                      disabled={cachingPkg === pkg}
                      onClick={() => handlePrecache(pkg)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-mono font-bold transition-all ${
                        precachedPkgs.includes(pkg)
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
