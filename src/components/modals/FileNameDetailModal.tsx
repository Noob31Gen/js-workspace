import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileCode, Folder, Copy, Check, X } from 'lucide-react';
import { WorkspaceNode } from '@/lib/workspace-store';

interface FileNameDetailModalProps {
  node: WorkspaceNode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FileNameDetailModal: React.FC<FileNameDetailModalProps> = ({
  node,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !node) return null;

  const isFolder = node.type === 'folder';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path || node.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 my-auto animate-in zoom-in-95 duration-150 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-detail-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              {isFolder ? <Folder className="h-5 w-5 text-amber-400" /> : <FileCode className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <h3 id="file-detail-title" className="text-sm font-bold text-foreground">
                {isFolder ? 'Folder Details' : 'File Details'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Full unclipped name & relative path</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Close"
            aria-label="Close details dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Full Name Display Box */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Full {isFolder ? 'Folder' : 'File'} Name
          </div>
          <div className="p-3 rounded-xl border border-border/60 bg-muted/30 font-mono text-xs text-foreground font-bold break-all select-all leading-relaxed">
            {node.name}
          </div>
        </div>

        {/* Full Path Display Box */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Full Relative Path
          </div>
          <div className="p-3 rounded-xl border border-border/60 bg-muted/30 font-mono text-xs text-muted-foreground break-all select-all flex items-center justify-between gap-2">
            <span className="break-all">{node.path || node.name}</span>
            <button
              type="button"
              onClick={handleCopyPath}
              className="p-1.5 rounded-lg bg-background border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0 cursor-pointer flex items-center gap-1"
              title="Copy relative path"
              aria-label="Copy relative path"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {copied && <p className="text-[10px] text-emerald-400 font-semibold text-right">Path copied to clipboard!</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer"
            aria-label="Close"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
