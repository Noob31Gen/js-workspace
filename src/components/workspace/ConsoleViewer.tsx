import React, { useState } from 'react';
import { ConsoleLogMessage } from '@/lib/worker-runner';
import { Terminal, Trash2, Copy, Check, Clock, AlertCircle, CheckCircle2, ChevronRight, FileJson, Maximize2 } from 'lucide-react';

interface ConsoleViewerProps {
  logs: ConsoleLogMessage[];
  onClearLogs: () => void;
  outputResult: any;
  errorResult: string | null;
  executionTimeMs?: number;
  onOpenResultWindow?: () => void;
}

export const ConsoleViewer: React.FC<ConsoleViewerProps> = ({
  logs,
  onClearLogs,
  outputResult,
  errorResult,
  executionTimeMs,
  onOpenResultWindow
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'result' | 'raw'>('logs');
  const [copied, setCopied] = useState(false);

  const handleCopyResult = () => {
    const text = typeof outputResult === 'object' ? JSON.stringify(outputResult, null, 2) : String(outputResult);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[340px]">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5 shrink-0 select-none gap-4">
        {/* Left Side: Title & Tabs */}
        <div className="flex items-center gap-4 min-w-0 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-foreground whitespace-nowrap">
            <Terminal className="h-4 w-4 text-primary shrink-0" />
            <span>Console Execution Output</span>
          </div>

          <div className="flex items-center rounded-lg border border-border/60 bg-background p-0.5 text-xs whitespace-nowrap shrink-0">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-md font-medium transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('result')}
              className={`px-3 py-1 rounded-md font-medium transition-all whitespace-nowrap ${activeTab === 'result' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Return Value
            </button>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          {onOpenResultWindow && (
            <button
              onClick={onOpenResultWindow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer whitespace-nowrap shadow-xs"
              title="Open Execution Result & Console in Full Window"
            >
              <Maximize2 className="h-3.5 w-3.5 shrink-0" />
              <span>Open Full Window</span>
            </button>
          )}

          {executionTimeMs !== undefined && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border border-border/40 whitespace-nowrap">
              <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{executionTimeMs}ms</span>
            </span>
          )}

          {outputResult !== null && (
            <button
              onClick={handleCopyResult}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
              title="Copy Result payload"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
              <span>{copied ? 'Copied' : 'Copy Result'}</span>
            </button>
          )}

          <button
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-all whitespace-nowrap"
            title="Clear output console"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 bg-[#0c0c0e] overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-2">
        {errorResult && (
          <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Execution Error
            </div>
            <pre className="whitespace-pre-wrap break-all text-[11px]">{errorResult}</pre>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-1.5">
            {logs.length === 0 && !errorResult && (
              <div className="h-40 flex items-center justify-center text-muted-foreground/60 text-xs italic">
                No output logged yet. Click "Run Script" to start execution.
              </div>
            )}

            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border flex items-start gap-2 ${
                  log.type === 'error'
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : log.type === 'warn'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : log.type === 'table'
                    ? 'border-blue-500/30 bg-blue-500/5 text-blue-300'
                    : 'border-border/40 bg-card/40 text-foreground'
                }`}
              >
                <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">{log.timestamp}</span>
                <span className="text-[10px] font-bold uppercase shrink-0 px-1 py-0.2 rounded bg-muted/40">
                  {log.type}
                </span>
                <div className="flex-1 overflow-x-auto whitespace-pre-wrap break-all">
                  {log.data.map((item, idx) => (
                    <span key={idx} className="mr-2">
                      {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'result' && (
          <div className="p-2">
            {outputResult === null ? (
              <div className="text-muted-foreground/60 italic text-xs">
                No value returned by function run(args).
              </div>
            ) : (
              <pre className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs whitespace-pre-wrap break-all overflow-x-auto">
                {typeof outputResult === 'object' ? JSON.stringify(outputResult, null, 2) : String(outputResult)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
