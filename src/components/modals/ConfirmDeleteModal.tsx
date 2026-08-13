import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Folder, FileCode, Layers } from 'lucide-react';

export interface DeleteTarget {
  type: 'file' | 'folder' | 'workspace';
  id: string;
  name: string;
  itemCount?: number;
}

interface ConfirmDeleteModalProps {
  target: DeleteTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  target,
  isOpen,
  onClose,
  onConfirm
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  const isFolder = target.type === 'folder';
  const isWorkspace = target.type === 'workspace';

  const typeLabel = isWorkspace ? 'Workspace' : isFolder ? 'Folder' : 'File';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-5 my-auto animate-in zoom-in-95 duration-150 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-xs shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-base font-bold text-foreground">
                Confirm {typeLabel} Deletion
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Close dialog (Esc)"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item Banner Box */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {isWorkspace ? (
              <Layers className="h-4 w-4 text-purple-400 shrink-0" />
            ) : isFolder ? (
              <Folder className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <FileCode className="h-4 w-4 text-primary shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Target {typeLabel}
              </div>
              <div className="text-xs font-mono font-bold text-foreground truncate">
                {target.name}
              </div>
            </div>
          </div>

          {isFolder && target.itemCount !== undefined && target.itemCount > 0 && (
            <div className="text-[11px] text-amber-400/90 font-medium pt-1.5 border-t border-border/40">
              ⚠️ Deleting this folder will permanently delete <span className="font-bold">{target.itemCount}</span> nested items inside.
            </div>
          )}

          {isWorkspace && (
            <div className="text-[11px] text-purple-400/90 font-medium pt-1.5 border-t border-border/40">
              ⚠️ Deleting this workspace will remove all <span className="font-bold">{target.itemCount || 0}</span> workspace files and scripts.
            </div>
          )}
        </div>

        {/* Warning Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Are you sure you want to delete <code className="text-destructive font-mono font-bold bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">{target.name}</code>?
        </p>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground text-xs font-semibold hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold shadow-md hover:bg-destructive/90 transition-all cursor-pointer"
            aria-label={`Confirm deletion of ${target.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete {typeLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
