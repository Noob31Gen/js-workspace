import React, { useRef } from 'react';
import { Play, Square, Copy, Check, Upload, Download, Code2, Sparkles } from 'lucide-react';

interface ScriptEditorProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  code,
  onChangeCode,
  onRun,
  onStop,
  isRunning
}) => {
  const [copied, setCopied] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace-script.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onChangeCode(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[480px]">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold font-mono tracking-tight text-foreground">
            Script Editor (JavaScript / ES2022)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".js,.ts,.txt"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
            title="Import JS script file"
          >
            <Upload className="h-3 w-3" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
            title="Export script to file"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!isRunning ? (
            <button
              onClick={onRun}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run Script</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow hover:bg-destructive/90 transition-all animate-pulse"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Textarea Area */}
      <div className="relative flex-1 bg-[#0c0c0e]">
        <textarea
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full resize-none p-4 font-mono text-xs text-foreground bg-transparent focus:outline-none leading-relaxed border-0 selection:bg-primary/30"
          placeholder="// Write your JavaScript script here..."
        />
      </div>
    </div>
  );
};
