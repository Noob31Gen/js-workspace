import React, { useState } from 'react';
import { FramePayload } from '@/lib/worker-runner';
import { Monitor, Smartphone, Tablet, ExternalLink, Copy, Download, Check, Sparkles, Code, Table as TableIcon } from 'lucide-react';

interface FramePreviewProps {
  frame: FramePayload | null;
  onClearFrame?: () => void;
}

export const FramePreview: React.FC<FramePreviewProps> = ({ frame }) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [frameBg, setFrameBg] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!frame) return null;

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
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-lg space-y-0">
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
              src={frame.content}
              alt="Frame Rendered Output"
              className="max-h-[400px] rounded-lg border border-border/60 shadow-lg object-contain"
            />
            <a
              href={frame.content}
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

        {frame.type === 'table' && Array.isArray(frame.content) && (
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
                {frame.content.length} Total Records
              </span>
            </div>

            <div className="rounded-lg border border-border/60 overflow-x-auto bg-background">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-3 py-2 border-r border-border/40 w-12">#</th>
                    {Object.keys(frame.content[0] || {}).map((colKey) => (
                      <th key={colKey} className="px-3 py-2 border-r border-border/40 font-mono">
                        {colKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {frame.content
                    .filter(row => !searchTerm || JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 50)
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 border-r border-border/40 text-muted-foreground text-[11px]">{idx + 1}</td>
                        {Object.keys(frame.content[0] || {}).map((colKey) => (
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
        )}
      </div>
    </div>
  );
};
