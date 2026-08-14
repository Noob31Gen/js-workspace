import React, { useState } from 'react';
import { FramePayload } from '@/lib/worker-runner';
import { Monitor, Smartphone, Tablet, Copy, Download, Check, Sparkles, Layout } from 'lucide-react';

interface FramePreviewProps {
  frame: FramePayload | null;
  onClearFrame?: () => void;
}

export const FramePreview: React.FC<FramePreviewProps> = ({ frame }) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [frameBg, setFrameBg] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!frame) {
    return (
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-full min-h-0 flex-1 md:h-[520px]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3.5 py-2 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold font-mono text-foreground">Frame Preview</span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40">
            No Active Frame
          </span>
        </div>

        {/* Empty State Banner Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary shadow-lg shadow-primary/5">
            <Layout className="h-7 w-7" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight mb-1">
            No Visual Frame Rendered Yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-5">
            Visual Frame Previews render interactive HTML widgets, structured tabular data, or images generated directly by your JavaScript scripts.
          </p>

          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 max-w-lg w-full text-left font-mono text-xs space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                How to render a Visual Frame
              </span>
            </div>

            <div className="space-y-2.5 text-[11px] text-muted-foreground">
              <div>
                <span className="text-amber-400 font-bold">1. Standard Browser Web Page DOM:</span>
                <pre className="mt-1 bg-background p-2 rounded-lg border border-border/60 text-foreground overflow-x-auto text-[11px]">
                  {`document.body.innerHTML = '<h1>Hello Web Page!</h1>';\n// or document.write('<h2>Hello Web Page</h2>');`}
                </pre>
              </div>

              <div>
                <span className="text-emerald-400 font-bold">2. Return HTML Component Object:</span>
                <pre className="mt-1 bg-background p-2 rounded-lg border border-border/60 text-foreground overflow-x-auto text-[11px]">
                  {`return { __html: '<div style="color:#10b981">Hello UI Frame!</div>' };`}
                </pre>
              </div>

              <div>
                <span className="text-blue-400 font-bold">3. Return Tabular Data Array:</span>
                <pre className="mt-1 bg-background p-2 rounded-lg border border-border/60 text-foreground overflow-x-auto text-[11px]">
                  {`return [{ ID: 1, Host: 'api.cloud.net', Status: 'Online' }];`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'w-full';
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-full min-h-0 flex-1 md:h-[520px]">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              {frame.title || 'Visual Sandbox Frame Preview'}
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] uppercase font-mono font-bold border border-primary/20">
                {frame.type}
              </span>
            </h3>
          </div>
        </div>

        {/* Viewport & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {frame.type === 'html' && (
            <>
              <div className="flex items-center rounded-lg border border-border/60 bg-background p-0.5 text-xs">
                <button
                  onClick={() => setViewport('desktop')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${viewport === 'desktop' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Desktop View (100%)"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  onClick={() => setViewport('tablet')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${viewport === 'tablet' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">768px</span>
                </button>
                <button
                  onClick={() => setViewport('mobile')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${viewport === 'mobile' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">375px</span>
                </button>
              </div>

              <button
                onClick={() => setFrameBg(prev => prev === 'dark' ? 'light' : 'dark')}
                className="rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                {frameBg === 'dark' ? '☀️ Light Frame' : '🌙 Dark Frame'}
              </button>
            </>
          )}

          <button
            onClick={() => handleCopy(typeof frame.content === 'string' ? frame.content : JSON.stringify(frame.content, null, 2))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Frame Content Body */}
      <div className={`p-4 transition-all flex justify-center ${frameBg === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
        {frame.type === 'html' && (
          <div className={`${getViewportWidth()} transition-all duration-300 rounded-lg overflow-hidden border border-border/40 shadow-md`}>
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8"/>
                    <style>
                      body { 
                        margin: 0; 
                        padding: 16px; 
                        font-family: system-ui, -apple-system, sans-serif; 
                        color: ${frameBg === 'dark' ? '#fafafa' : '#09090b'}; 
                        background: ${frameBg === 'dark' ? '#0c0c0e' : '#ffffff'};
                      }
                      * { box-sizing: border-box; }
                    </style>
                  </head>
                  <body>${frame.content}</body>
                </html>
              `}
              title="Frame Output Preview"
              className="w-full min-h-[320px] max-h-[500px] border-0 bg-transparent"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        )}

        {frame.type === 'image' && (
          <div className="flex flex-col items-center gap-3 p-4">
            <img
              src={String(frame.content)}
              alt="Frame Rendered Output"
              className="max-h-[400px] rounded-lg border border-border/60 shadow-lg object-contain"
            />
            <a
              href={String(frame.content)}
              download="frame-output.png"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download Image Frame
            </a>
          </div>
        )}

        {frame.type === 'table' && Array.isArray(frame.content) && (() => {
          const tableRows = frame.content as Record<string, unknown>[];
          const firstRow = tableRows[0] || {};
          return (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Filter table records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {tableRows.length} Total Records
                </span>
              </div>

              <div className="rounded-lg border border-border/60 overflow-x-auto bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-3 py-2 border-r border-border/40 w-12">#</th>
                      {Object.keys(firstRow).map((colKey) => (
                        <th key={colKey} className="px-3 py-2 border-r border-border/40 font-mono">
                          {colKey}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {tableRows
                      .filter(row => !searchTerm || JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice(0, 50)
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2 border-r border-border/40 text-muted-foreground text-[11px]">{idx + 1}</td>
                          {Object.keys(firstRow).map((colKey) => (
                            <td key={colKey} className="px-3 py-2 border-r border-border/40 break-all max-w-xs">
                              {typeof row[colKey] === 'object' ? JSON.stringify(row[colKey]) : String(row[colKey] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
