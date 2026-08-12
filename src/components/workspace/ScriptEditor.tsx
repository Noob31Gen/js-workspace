import React, { useRef, useMemo, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import { Play, Square, Copy, Check, Download, Code2 } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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

  // Sync scroll positions between textarea, syntax overlay, and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (preRef.current) {
        preRef.current.scrollTop = scrollTop;
        preRef.current.scrollLeft = scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  };

  // Handle Tab key press for 2-space indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChangeCode(newCode);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Highlight JS code tokens in real-time
  const highlightedHtml = useMemo(() => {
    try {
      return Prism.highlight(code || '', Prism.languages.javascript, 'javascript');
    } catch {
      return code || '';
    }
  }, [code]);

  // Compute line numbers
  const lineNumbers = useMemo(() => {
    const lines = (code || '').split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  }, [code]);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[480px]">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold font-mono tracking-tight text-foreground">
            Script Editor (JavaScript / ES2022)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Export script to file"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!isRunning ? (
            <button
              onClick={onRun}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run Script</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow hover:bg-destructive/90 transition-all animate-pulse cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Syntax Highlighted Editor Area */}
      <div className="relative flex-1 bg-[#070b14] overflow-hidden flex">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="w-10 shrink-0 py-4 select-none font-mono text-[11px] text-zinc-600 text-right pr-2.5 bg-[#05080f] border-r border-zinc-800/80 overflow-hidden leading-relaxed"
        >
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Textarea & Syntax Overlay Container */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Syntax Highlighted Code Overlay */}
          <pre
            ref={preRef}
            className="absolute inset-0 p-4 font-mono text-xs leading-relaxed overflow-hidden pointer-events-none m-0 bg-transparent border-0 whitespace-pre text-zinc-200"
          >
            <code
              className="language-javascript bg-transparent p-0 border-0"
              dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
            />
          </pre>

          {/* Transparent Interactive Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-relaxed text-transparent caret-emerald-400 bg-transparent focus:outline-none resize-none border-0 whitespace-pre selection:bg-primary/30 selection:text-foreground"
            placeholder="// Write your JavaScript script here..."
          />
        </div>
      </div>
    </div>
  );
};
