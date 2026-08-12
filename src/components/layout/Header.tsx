import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Terminal, Code2, BookOpen, ExternalLink, Globe, Wifi, WifiOff, Download, Check, Sparkles, X } from 'lucide-react';
import { checkExtensionConnected } from '@/lib/extension-client';
import { precacheNpmPackage } from '@/lib/pwa-register';

interface HeaderProps {
  onOpenDocs: (docName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDocs }) => {
  const [extensionActive, setExtensionActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [customPkgInput, setCustomPkgInput] = useState<string>('');
  const [precachedPkgs, setPrecachedPkgs] = useState<string[]>(['lodash', 'dayjs', 'papaparse']);
  const [cachingPkg, setCachingPkg] = useState<string | null>(null);

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
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

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline / Online Status Badge */}
        <button
          onClick={() => setIsOfflineModalOpen(true)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all cursor-pointer ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
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

        {/* Extension Connection Status Badge */}
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          extensionActive 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {extensionActive ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">CORS Helper Connected</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">CORS Helper Inactive</span>
            </>
          )}
        </div>

        {/* Documentation Button */}
        <button
          onClick={() => onOpenDocs('ARCHITECTURE.md')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Docs</span>
        </button>

        <a
          href="https://noob31.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden md:inline">My Website</span>
        </a>

        <a
          href="https://github.com/Noob31Gen/noob31-multitool"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">GitHub</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>

      {/* Offline PWA Package Manager Modal */}
      {isOfflineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
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
        </div>
      )}
    </header>
  );
};
