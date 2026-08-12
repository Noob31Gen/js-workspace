import React from 'react';
import { Play, Square, Code, Sparkles, Copy, Check } from 'lucide-react';

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

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[400px]">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Script Editor</span>
          <span className="text-[10px] text-muted-foreground/70 font-mono hidden sm:inline">(JavaScript / ES2022)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {isRunning ? (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3.5 py-1.5 text-xs font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-all active:scale-95"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop Worker
            </button>
          ) : (
            <button
              onClick={onRun}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run Script
            </button>
          )}
        </div>
      </div>

      {/* Code Textarea / Monaco Container */}
      <div className="relative flex-1 bg-zinc-950 p-3 font-mono text-xs">
        <textarea
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full bg-transparent text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none leading-relaxed font-mono"
          placeholder="// Write your async function run({ arg1, arg2 }) script here..."
        />
      </div>
    </div>
  );
};
