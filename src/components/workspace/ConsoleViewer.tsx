import React from 'react';
import { Terminal, Trash2, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { ConsoleLogMessage } from '@/lib/worker-runner';

interface ConsoleViewerProps {
  logs: ConsoleLogMessage[];
  onClearLogs: () => void;
  outputResult: any;
  errorResult: string | null;
}

export const ConsoleViewer: React.FC<ConsoleViewerProps> = ({
  logs,
  onClearLogs,
  outputResult,
  errorResult
}) => {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[320px]">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Worker Console & Output</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
            {logs.length} logs
          </span>
        </div>

        <button
          onClick={onClearLogs}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      {/* Log Output Body */}
      <div className="flex-1 bg-zinc-950 p-4 font-mono text-xs overflow-y-auto space-y-2">
        {logs.length === 0 && !errorResult && outputResult === null && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center">
            <Terminal className="h-8 w-8 mb-2 opacity-30" />
            <p>Click "Run Script" to execute worker code and view real-time log output here.</p>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 text-zinc-300 leading-relaxed font-mono">
            <span className="text-[10px] text-zinc-600 shrink-0 select-none mt-0.5">{log.timestamp}</span>

            {log.type === 'warn' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />}
            {log.type === 'error' && <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />}
            {log.type === 'info' && <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />}

            <div className="flex-1 break-all">
              {log.data.map((item, idx) => (
                <span key={idx} className="mr-2">
                  {typeof item === 'object' ? (
                    <pre className="inline-block bg-zinc-900 text-emerald-400 p-1.5 rounded text-[11px] overflow-x-auto my-1 border border-zinc-800">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  ) : (
                    <span>{String(item)}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}

        {errorResult && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs flex items-start gap-2 my-2">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Execution Error</div>
              <div>{errorResult}</div>
            </div>
          </div>
        )}

        {outputResult !== null && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs space-y-1 my-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Return Value</span>
            </div>
            <pre className="text-[11px] overflow-x-auto text-emerald-200">
              {typeof outputResult === 'object' ? JSON.stringify(outputResult, null, 2) : String(outputResult)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
