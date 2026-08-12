import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { downloadExtensionZip } from '@/lib/extension-downloader';
import { checkExtensionConnected } from '@/lib/extension-client';

interface ExtensionModalProps {
  isOpen: boolean;
  extensionActive: boolean;
  onClose: () => void;
  onRefreshStatus: () => Promise<void>;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
  isOpen,
  extensionActive,
  onClose,
  onRefreshStatus
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (e) {
      alert('Failed to generate extension zip package.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    await onRefreshStatus();
    setTimeout(() => setIsChecking(false), 500);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              extensionActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {extensionActive ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-sans flex items-center gap-2">
                CORS Helper Extension
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                  extensionActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {extensionActive ? 'Connected' : 'Inactive'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Enables cross-origin network requests directly from browser scripts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          extensionActive
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full shrink-0 ${
              extensionActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
            }`} />
            <div className="text-xs">
              <div className="font-bold">
                {extensionActive ? 'CORS Helper is Active & Ready' : 'Helper Extension Not Detected'}
              </div>
              <div className="text-[11px] opacity-80">
                {extensionActive
                  ? 'All script fetch() requests will bypass CORS boundaries smoothly.'
                  : 'Install the extension below to enable cross-origin fetching.'}
              </div>
            </div>
          </div>

          <button
            onClick={handleRecheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/60 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-all shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Re-check</span>
          </button>
        </div>

        {/* Extension Package Download Button */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-primary">Helper Extension Package (.zip)</div>
              <div className="text-[11px] text-muted-foreground">Contains Chrome V3 Service Worker & Manifest</div>
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download Extension Package</span>
            </button>
          </div>
        </div>

        {/* 3-Step Setup Guide */}
        <div className="space-y-2.5 text-xs text-muted-foreground pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            3-Step Installation Walkthrough:
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</span>
              <div>
                <span className="font-bold text-foreground">Download & Extract Zip:</span> Click the button above to save <code className="text-primary font-mono">js-workspace-cors-extension.zip</code> and extract its contents.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</span>
              <div>
                <span className="font-bold text-foreground">Open Chrome Extensions:</span> Navigate to <code className="text-primary font-mono font-bold">chrome://extensions</code> in Chrome/Edge and toggle on <strong className="text-foreground">Developer Mode</strong> in the top-right.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</span>
              <div>
                <span className="font-bold text-foreground">Load Unpacked:</span> Click <strong className="text-foreground">"Load unpacked"</strong> and select the unzipped extension directory. The badge above will turn green instantly!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
