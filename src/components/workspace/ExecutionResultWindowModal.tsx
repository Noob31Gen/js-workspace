import React from 'react';
import { createPortal } from 'react-dom';
import { Terminal, X, Play, Sparkles, Maximize2 } from 'lucide-react';
import { ConsoleLogMessage, FramePayload } from '@/lib/worker-runner';

interface ExecutionResultWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  outputResult: any;
  errorResult: string | null;
  executionTimeMs?: number | null;
  logs: ConsoleLogMessage[];
  frame: FramePayload | null;
  activeFileName: string;
}

export const ExecutionResultWindowModal: React.FC<ExecutionResultWindowModalProps> = ({
  isOpen,
  onClose,
  outputResult,
  errorResult,
  executionTimeMs,
  logs,
  frame,
  activeFileName
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-6xl h-[88vh] max-h-[88vh] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in duration-150">
        {/* Modal Window Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Maximize2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-sans flex items-center gap-2">
                Execution Result & Console Output Window
                <span className="bg-primary/20 text-primary text-[11px] font-mono px-2 py-0.5 rounded-md border border-primary/30">
                  {activeFileName}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Side-by-side view for script return payloads, generated frames, and console streaming
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border/60 bg-background/50">
          {/* Left Column: Return Value & Generated Frames */}
          <div className="p-6 overflow-y-auto space-y-4 flex flex-col">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Execution Result Output</span>
            </div>

            {outputResult !== null || errorResult !== null ? (
              <div className="space-y-4 flex-1">
                {/* Status Card */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  !errorResult
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}>
                  <div className="font-mono text-xs font-bold">
                    {!errorResult ? '✓ Script Completed Successfully' : '❌ Script Threw Runtime Error'}
                  </div>
                  {executionTimeMs !== null && (
                    <div className="text-[11px] font-mono opacity-80">
                      Execution Time: {executionTimeMs} ms
                    </div>
                  )}
                </div>

                {/* Error Banner if any */}
                {errorResult && (
                  <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-mono whitespace-pre-wrap">
                    {errorResult}
                  </div>
                )}

                {/* Returned Value Payload */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase font-mono">
                    Returned Value Payload:
                  </div>
                  <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60">
                    {outputResult !== undefined
                      ? (typeof outputResult === 'object'
                          ? JSON.stringify(outputResult, null, 2)
                          : String(outputResult))
                      : '(undefined)'}
                  </pre>
                </div>

                {/* Rendered Frame Output */}
                {frame && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase font-mono">
                      Generated Frame Output:
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      {frame.type === 'image' && (
                        <img src={frame.content} alt="Frame" className="max-h-48 rounded border border-border object-contain mx-auto" />
                      )}
                      {frame.type === 'html' && (
                        <div className="p-2 bg-background text-foreground rounded text-xs" dangerouslySetInnerHTML={{ __html: frame.content }} />
                      )}
                      {frame.type === 'json' && (
                        <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">{JSON.stringify(frame.content, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center border border-dashed border-border/60 rounded-xl">
                <Play className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs">No script execution output yet.</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">Run your script to view returned data payloads here.</p>
              </div>
            )}
          </div>

          {/* Right Column: Console Log Stream */}
          <div className="p-6 overflow-y-auto space-y-4 flex flex-col bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>Live Console Stream ({logs.length} messages)</span>
              </div>
            </div>

            {logs.length > 0 ? (
              <div className="flex-1 space-y-1.5 font-mono text-xs overflow-y-auto pr-1">
                {logs.map((log) => {
                  const logStr = (log.data || []).map(d => typeof d === 'object' ? JSON.stringify(d) : String(d)).join(' ');
                  return (
                    <div
                      key={log.id}
                      className={`p-2 rounded-lg border text-xs leading-relaxed flex items-start gap-2 ${
                        log.type === 'error'
                          ? 'bg-destructive/10 border-destructive/30 text-destructive'
                          : log.type === 'warn'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="text-[10px] text-zinc-500 shrink-0 font-mono">[{log.timestamp}]</span>
                      <span className="whitespace-pre-wrap break-all">{logStr}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center border border-dashed border-border/60 rounded-xl">
                <Terminal className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-mono">Console is empty.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Window Footer */}
        <div className="flex items-center justify-end border-t border-border/40 bg-muted/20 px-6 py-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer"
          >
            Close Output Window
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
