import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, X, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import { downloadExtensionZip } from '@/lib/extension-downloader';

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

  // Double Confirmation Modal State
  const [showConfirmDownload, setShowConfirmDownload] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleExecuteDownload = async () => {
    setIsDownloading(true);
    setShowConfirmDownload(false);
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
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/60 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Re-check</span>
          </button>
        </div>

        {/* Broad Security & Compatibility Warning Box */}
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Important Security & Usage Warning</span>
          </div>
          <p className="leading-relaxed opacity-95">
            Browser extensions granted cross-origin permissions have broad network access capabilities.
            <strong className="text-amber-300 font-semibold underline decoration-amber-500/50 block mt-1">
              Only install this extension if your target request server does NOT allow all origins (CORS header <code className="font-mono text-[10px] bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/30">Access-Control-Allow-Origin: *</code> is missing).
            </strong>
          </p>
          <p className="text-[11px] opacity-85 leading-normal pt-1 border-t border-amber-500/20">
            If the API or web server you are fetching already supports cross-origin requests, or if your scripts only process local data, you do <strong>NOT</strong> need to install this extension.
          </p>
        </div>

        {/* Extension Package Download Section */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-primary">Helper Extension Package (.zip)</div>
              <div className="text-[11px] text-muted-foreground">Contains Chrome V3 Service Worker & Manifest</div>
            </div>
            <button
              onClick={() => {
                setRiskAcknowledged(false);
                setShowConfirmDownload(true);
              }}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 shrink-0"
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
            className="px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Double Confirmation Modal for Extension Package Download */}
      {showConfirmDownload && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Double Confirm Header */}
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground font-sans">
                  Confirm Extension Download
                </h4>
                <p className="text-xs text-amber-400/90 font-medium">
                  Potential Security Risk Verification
                </p>
              </div>
            </div>

            {/* Double Confirm Warning Content */}
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                Installing unpacked browser extensions grants local background network permissions.
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] font-semibold space-y-1">
                <div>⚠️ Usage Checklist:</div>
                <ul className="list-disc list-inside space-y-1 font-normal opacity-90">
                  <li>Does your target server reject cross-origin requests?</li>
                  <li>If the server allows all origins (<code className="font-mono">Access-Control-Allow-Origin: *</code>), cancel this download.</li>
                </ul>
              </div>
            </div>

            {/* Required Risk Acknowledgment Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={riskAcknowledged}
                onChange={(e) => setRiskAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
              />
              <span className="text-xs text-foreground font-medium leading-snug">
                I understand the security implications and confirm my target server blocks CORS requests.
              </span>
            </label>

            {/* Double Confirm Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDownload(false);
                  setRiskAcknowledged(false);
                }}
                className="px-4 py-2 rounded-xl border border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDownload}
                disabled={!riskAcknowledged}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold shadow hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>Confirm & Download Zip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
