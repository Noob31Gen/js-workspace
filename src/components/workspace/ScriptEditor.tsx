import React, { useRef, useMemo, useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import { Play, Square, Copy, Check, Download, Code2, Save, Undo2, Redo2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ScriptEditorProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  onSaveScript?: (code: string) => void;
}

export interface SyntaxErrorDetails {
  message: string;
  line: number | null;
  column: number | null;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  code,
  onChangeCode,
  onRun,
  onStop,
  isRunning,
  onSaveScript
}) => {
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([code]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isHistoryUpdate = useRef(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Record history on code change (debounced)
  useEffect(() => {
    if (isHistoryUpdate.current) {
      isHistoryUpdate.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (code !== history[historyIndex]) {
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push(code);
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [code]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      isHistoryUpdate.current = true;
      setHistoryIndex(prevIndex);
      onChangeCode(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      isHistoryUpdate.current = true;
      setHistoryIndex(nextIndex);
      onChangeCode(history[nextIndex]);
    }
  };

  const handleManualSave = () => {
    if (onSaveScript) {
      onSaveScript(code);
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleManualSave();
      return;
    }

    // Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z (Redo)
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Tab key for 2-space indentation
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

  // Sync scroll positions
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

  // Real-time JS Syntax Error Validator
  const syntaxError: SyntaxErrorDetails | null = useMemo(() => {
    if (!code || !code.trim()) return null;
    try {
      // Wrap code in Function to validate syntax
      new Function(`return (async () => {\n${code}\n})();`);
      return null;
    } catch (err: any) {
      let line: number | null = null;
      let column: number | null = null;
      const msg = err.message || 'Syntax Error';

      // Parse line number from stack or message if available
      const lineMatch = err.stack?.match(/<anonymous>:(\d+):(\d+)/) || msg.match(/line (\d+)/i) || msg.match(/(\d+):(\d+)/);
      if (lineMatch) {
        const parsedLine = parseInt(lineMatch[1], 10);
        if (!isNaN(parsedLine)) {
          // Adjust line offset because of Function wrapper header line
          line = Math.max(1, parsedLine > 1 ? parsedLine - 1 : parsedLine);
        }
      }

      return {
        message: msg,
        line,
        column
      };
    }
  }, [code]);

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
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-[580px]">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3.5 py-2 shrink-0 overflow-x-auto select-none gap-3">
        {/* Left Side: Title & Syntax Indicator */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <Code2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold font-mono tracking-tight text-foreground whitespace-nowrap hidden sm:inline">
            Script Editor
          </span>

          {syntaxError ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/15 px-2.5 py-1 text-xs font-mono font-medium text-destructive border border-destructive/30 whitespace-nowrap">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Syntax Error</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Syntax Valid</span>
            </span>
          )}
        </div>

        {/* Right Side: Editor Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Manual Save Button */}
          <button
            onClick={handleManualSave}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer border whitespace-nowrap ${
              justSaved
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
            }`}
            title="Manual Save Script (Ctrl+S)"
          >
            {justSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 shrink-0" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Undo / Redo Buttons */}
          <div className="inline-flex items-center border border-border/60 rounded-md overflow-hidden bg-background">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-border/60" />
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer whitespace-nowrap"
            title="Export script to file"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer whitespace-nowrap"
            title="Copy script to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Run / Stop Button */}
          {!isRunning ? (
            <button
              onClick={onRun}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5 fill-current shrink-0" />
              <span>Run Script</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-all animate-pulse cursor-pointer whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5 fill-current shrink-0" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Syntax Highlighted Editor Area */}
      <div className="relative flex-1 bg-[#070b14] overflow-hidden flex flex-col">
        <div className="relative flex-1 flex overflow-hidden">
          {/* Line Numbers Column with Error Badging */}
          <div
            ref={lineNumbersRef}
            className="w-10 shrink-0 py-4 select-none font-mono text-[11px] text-zinc-600 text-right pr-2.5 bg-[#05080f] border-r border-zinc-800/80 overflow-hidden leading-relaxed"
          >
            {lineNumbers.map(n => {
              const isErrorLine = syntaxError && syntaxError.line === n;
              return (
                <div
                  key={n}
                  className={`flex items-center justify-end ${
                    isErrorLine ? 'text-destructive font-bold bg-destructive/20 rounded px-1' : ''
                  }`}
                >
                  {isErrorLine && <AlertTriangle className="h-2.5 w-2.5 text-destructive mr-1 shrink-0" />}
                  <span>{n}</span>
                </div>
              );
            })}
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

        {/* Syntax Error Banner */}
        {syntaxError && (
          <div className="px-4 py-2 bg-destructive/15 border-t border-destructive/30 text-destructive text-xs font-mono flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <span className="truncate">{syntaxError.message}</span>
            </div>
            {syntaxError.line && (
              <span className="px-2 py-0.5 rounded bg-destructive/20 font-bold shrink-0 ml-2">
                Line {syntaxError.line}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
