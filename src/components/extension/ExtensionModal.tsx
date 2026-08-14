import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, X, AlertTriangle, Lock, CheckCircle2, KeyRound, Trash2 } from 'lucide-react';
import { downloadExtensionZip } from '@/lib/extension-downloader';
import { setExtensionPassword, clearExtensionPassword, getExtensionAuthHash, checkExtensionDetailedStatus, ExtensionStatusResult } from '@/lib/extension-client';

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

  // Detailed Extension & Password Auth Status
  const [detailedStatus, setDetailedStatus] = useState<ExtensionStatusResult | null>(null);

  // Password Authentication State
  const [passwordInput, setPasswordInput] = useState('');
  const hasAuthHash = !!getExtensionAuthHash();
  const [hashSavedMsg, setHashSavedMsg] = useState<string | null>(null);

  // Double Confirmation Modal State
  const [showConfirmDownload, setShowConfirmDownload] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  const refreshDetailedStatus = async () => {
    const res = await checkExtensionDetailedStatus();
    setDetailedStatus(res);
  };

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      checkExtensionDetailedStatus().then(res => {
        if (isMounted) {
          setDetailedStatus(res);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    await setExtensionPassword(passwordInput.trim());
    setPasswordInput('');
    setHashSavedMsg('Password Hashed & Saved!');
    setTimeout(() => setHashSavedMsg(null), 3000);
    await handleRecheck();
  };

  const handleClearPassword = async () => {
    clearExtensionPassword();
    setHashSavedMsg('Password Auth Cleared');
    setTimeout(() => setHashSavedMsg(null), 3000);
    await handleRecheck();
  };

  const handleExecuteDownload = async () => {
    setIsDownloading(true);
    setShowConfirmDownload(false);
    try {
      await downloadExtensionZip();
    } catch {
      alert('Failed to generate extension zip package.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    await onRefreshStatus();
    await refreshDetailedStatus();
    setTimeout(() => setIsChecking(false), 500);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto overflow-x-hidden select-none">
      <div className="w-full max-w-lg max-w-[94vw] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
              detailedStatus?.status === 'CONNECTED_SECURE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : detailedStatus?.status === 'AUTH_FAILED'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : extensionActive
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {detailedStatus?.status === 'CONNECTED_SECURE' ? (
                <ShieldCheck className="h-5 w-5" />
              ) : detailedStatus?.status === 'AUTH_FAILED' ? (
                <Lock className="h-5 w-5" />
              ) : (
                <ShieldAlert className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground font-sans flex items-center flex-wrap gap-1.5 sm:gap-2">
                <span>CORS Helper Extension</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                  detailedStatus?.status === 'CONNECTED_SECURE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : detailedStatus?.status === 'AUTH_FAILED'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : extensionActive
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {detailedStatus?.status === 'CONNECTED_SECURE'
                    ? 'Authenticated'
                    : detailedStatus?.status === 'AUTH_FAILED'
                    ? 'Auth Mismatch'
                    : extensionActive
                    ? 'Active (No Auth)'
                    : 'Inactive'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Enables cross-origin network requests directly from browser scripts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          detailedStatus?.status === 'CONNECTED_SECURE'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : detailedStatus?.status === 'AUTH_FAILED'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : extensionActive
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-muted/40 border-border text-muted-foreground'
        }`}>
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 sm:mt-0 ${
              detailedStatus?.status === 'CONNECTED_SECURE'
                ? 'bg-emerald-400 animate-ping'
                : detailedStatus?.status === 'AUTH_FAILED'
                ? 'bg-rose-400 animate-pulse'
                : extensionActive
                ? 'bg-amber-400'
                : 'bg-muted-foreground'
            }`} />
            <div className="text-xs min-w-0">
              <div className="font-bold truncate">
                {detailedStatus?.status === 'CONNECTED_SECURE'
                  ? 'CORS Helper is Active & Authenticated'
                  : detailedStatus?.status === 'AUTH_FAILED'
                  ? 'Authentication Required / Password Mismatch'
                  : extensionActive
                  ? 'Extension Active (Unauthenticated)'
                  : 'Helper Extension Not Detected'}
              </div>
              <div className="text-[11px] opacity-80 leading-normal">
                {detailedStatus?.message || (extensionActive
                  ? 'All script fetch() requests will bypass CORS boundaries smoothly.'
                  : 'Install the extension below to enable cross-origin fetching.')}
              </div>
            </div>
          </div>

          <button
            onClick={handleRecheck}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-border/60 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-all w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Re-check</span>
          </button>
        </div>

        {/* SHA-256 Hashed Password Authentication Card */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <KeyRound className="h-4 w-4 text-primary shrink-0" />
              <div className="text-xs font-bold text-foreground truncate">Extension Hashed Authentication</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                hasAuthHash
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}>
                {hasAuthHash ? 'Hash Active' : 'No Password'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Enter the secret password configured in your extension settings. The site generates a SHA-256 hash locally to authenticate per request without transmitting plain text passwords.
          </p>

          <form onSubmit={handleSavePassword} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
            <input
              type="password"
              placeholder="Enter extension secret password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="submit"
                disabled={!passwordInput.trim()}
                className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
              >
                Save Hash
              </button>
              {hasAuthHash && (
                <button
                  type="button"
                  onClick={handleClearPassword}
                  title="Clear cached authentication hash"
                  className="p-1.5 rounded-lg border border-border bg-muted/30 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/40 text-muted-foreground transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {hashSavedMsg && (
            <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>{hashSavedMsg}</span>
            </div>
          )}
        </div>

        {/* Broad Security & Compatibility Warning Box */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs space-y-2 shadow-xs min-w-0">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Important Security & Usage Warning</span>
          </div>
          <p className="leading-relaxed opacity-95 text-[11px] sm:text-xs">
            Browser extensions granted cross-origin permissions have broad network access capabilities.
            <strong className="text-amber-300 font-semibold underline decoration-amber-500/50 block mt-1">
              Only install this extension if your target request server does NOT allow all origins (CORS header <code className="font-mono text-[10px] bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/30 break-all inline-block">Access-Control-Allow-Origin: *</code> is missing).
            </strong>
          </p>
          <p className="text-[11px] opacity-85 leading-normal pt-1 border-t border-amber-500/20">
            If the API or web server you are fetching already supports cross-origin requests, or if your scripts only process local data, you do <strong>NOT</strong> need to install this extension.
          </p>
        </div>

        {/* Extension Package Download Section */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-primary/30 bg-primary/10 space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <div className="text-xs font-bold text-primary truncate">Helper Extension Package (.zip)</div>
              <div className="text-[11px] text-muted-foreground truncate">Contains Chrome V3 Service Worker & Manifest</div>
            </div>
            <button
              onClick={() => {
                setRiskAcknowledged(false);
                setShowConfirmDownload(true);
              }}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto shrink-0"
            >
              {isDownloading ? (
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Download className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">Download Extension Package</span>
            </button>
          </div>
        </div>

        {/* 3-Step Setup Guide */}
        <div className="space-y-2.5 text-xs text-muted-foreground pt-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            3-Step Installation Walkthrough:
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</span>
              <div className="min-w-0">
                <span className="font-bold text-foreground">Download & Extract Zip:</span> Click the button above to save <code className="text-primary font-mono break-all">js-workspace-cors-extension.zip</code> and extract its contents.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</span>
              <div className="min-w-0">
                <span className="font-bold text-foreground">Open Chrome Extensions:</span> Navigate to <code className="text-primary font-mono font-bold break-all">chrome://extensions</code> in Chrome/Edge and toggle on <strong className="text-foreground">Developer Mode</strong> in the top-right.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</span>
              <div className="min-w-0">
                <span className="font-bold text-foreground">Load Unpacked:</span> Click <strong className="text-foreground">"Load unpacked"</strong> and select the unzipped extension directory. The badge above will turn green instantly!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>

      {/* Double Confirmation Modal for Extension Package Download */}
      {showConfirmDownload && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 select-none overflow-x-hidden">
          <div className="w-full max-w-md max-w-[94vw] rounded-2xl border border-amber-500/50 bg-card p-4 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 overflow-x-hidden">
            {/* Double Confirm Header */}
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground font-sans truncate">
                  Confirm Extension Download
                </h4>
                <p className="text-xs text-amber-400/90 font-medium truncate">
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
                  <li>If the server allows all origins (<code className="font-mono break-all">Access-Control-Allow-Origin: *</code>), cancel this download.</li>
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
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDownload(false);
                  setRiskAcknowledged(false);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDownload}
                disabled={!riskAcknowledged}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold shadow hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 shrink-0" />
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
