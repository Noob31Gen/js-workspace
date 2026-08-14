import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wifi, X, Download, Check, Sparkles } from 'lucide-react';
import { precacheNpmPackage, getPrecachedPackages, removePrecachedPackage, isNodeCoreModule } from '@/lib/pwa-register';

interface OfflinePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_COMMON_PACKAGES = ['lodash', 'axios', 'dayjs', 'papaparse', 'mathjs', 'cheerio'];

export const OfflinePackageModal: React.FC<OfflinePackageModalProps> = ({ isOpen, onClose }) => {
  const [customPkgInput, setCustomPkgInput] = useState<string>('');
  const [precachedPkgs, setPrecachedPkgs] = useState<string[]>(() => getPrecachedPackages());
  const [cachingPkg, setCachingPkg] = useState<string | null>(null);
  const [pkgErrorMsg, setPkgErrorMsg] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null);

  if (!isOpen) return null;

  const handlePrecache = async (pkgName: string) => {
    const clean = pkgName.trim().toLowerCase();
    if (!clean) return;
    setPkgErrorMsg(null);

    if (isNodeCoreModule(clean)) {
      setPkgErrorMsg({
        type: 'info',
        text: `Note: '${clean}' is a built-in Node.js module provided directly by the offline workspace polyfill engine.`
      });
      if (!precachedPkgs.includes(clean)) {
        setPrecachedPkgs(prev => [...prev, clean]);
      }
      return;
    }

    setCachingPkg(clean);
    const success = await precacheNpmPackage(clean);
    setCachingPkg(null);
    if (success) {
      if (!precachedPkgs.includes(clean)) {
        setPrecachedPkgs(prev => [...prev, clean]);
      }
      setPkgErrorMsg({
        type: 'success',
        text: `Package "${clean}" successfully pre-cached for offline use!`
      });
    } else {
      setPkgErrorMsg({
        type: 'error',
        text: `Failed to precache package "${clean}". Package does not exist on the NPM registry or network request failed.`
      });
    }
  };

  const handleRemovePrecache = (pkgName: string) => {
    removePrecachedPackage(pkgName);
    setPrecachedPkgs(prev => prev.filter(p => p !== pkgName));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overflow-x-hidden select-none">
      <div className="w-full max-w-md max-w-[94vw] max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wifi className="h-5 w-5 text-primary shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-foreground font-sans truncate">
              Offline PWA & Package Cache
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground">
          <p className="leading-relaxed text-[11px] sm:text-xs">
            The entire app shell, editor, virtual filesystem, and Node polyfills work 100% offline.
            You can pre-download NPM packages into local CacheStorage so <code className="text-primary font-mono font-bold">require('package')</code> works offline without internet!
          </p>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Quick Pre-Cache Common Packages:
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {DEFAULT_COMMON_PACKAGES.map(pkg => (
                <button
                  key={pkg}
                  type="button"
                  disabled={cachingPkg === pkg}
                  onClick={() => handlePrecache(pkg)}
                  className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                    precachedPkgs.includes(pkg)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-muted/50 text-foreground border-border hover:bg-primary/20 hover:border-primary'
                  }`}
                >
                  {cachingPkg === pkg ? (
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : precachedPkgs.includes(pkg) ? (
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Download className="h-3 w-3 shrink-0" />
                  )}
                  <span>{pkg}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cached Custom Extra Packages Section */}
          {precachedPkgs.filter(pkg => !DEFAULT_COMMON_PACKAGES.includes(pkg)).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between gap-2">
                <span className="truncate">Cached Custom Packages ({precachedPkgs.filter(pkg => !DEFAULT_COMMON_PACKAGES.includes(pkg)).length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {precachedPkgs.filter(pkg => !DEFAULT_COMMON_PACKAGES.includes(pkg)).map(pkg => (
                  <div
                    key={pkg}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/30 max-w-full truncate"
                  >
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[160px] sm:max-w-[200px]">{pkg}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePrecache(pkg)}
                      title={`Remove ${pkg} from precached list`}
                      className="ml-0.5 p-0.5 rounded text-emerald-400/70 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Package Error / Info / Success Message Banner */}
          {pkgErrorMsg && (
            <div className={`p-3 rounded-xl border flex items-start justify-between gap-2 text-xs font-sans animate-in fade-in duration-150 ${
              pkgErrorMsg.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : pkgErrorMsg.type === 'info'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-start gap-2 min-w-0">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug text-[11px] sm:text-xs">{pkgErrorMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setPkgErrorMsg(null)}
                className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Pre-cache Custom NPM Package:
            </div>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <input
                type="text"
                placeholder="e.g. canvas-confetti, cowsay"
                value={customPkgInput}
                onChange={(e) => setCustomPkgInput(e.target.value)}
                className="min-w-0 flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                disabled={!customPkgInput.trim() || cachingPkg === customPkgInput.trim()}
                onClick={() => {
                  handlePrecache(customPkgInput.trim());
                  setCustomPkgInput('');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer shrink-0"
              >
                Cache
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
