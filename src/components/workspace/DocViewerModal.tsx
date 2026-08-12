import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import { X, BookOpen, FileCode } from 'lucide-react';
import { DOCS_REGISTRY, DocItem } from '@/lib/docs-data';

interface DocViewerModalProps {
  docName: string | null;
  onClose: () => void;
}

export const DocViewerModal: React.FC<DocViewerModalProps> = ({ docName, onClose }) => {
  if (!docName) return null;

  const [activeDocKey, setActiveDocKey] = useState<string>(
    DOCS_REGISTRY[docName] ? docName : 'ARCHITECTURE.md'
  );

  const activeDoc: DocItem = DOCS_REGISTRY[activeDocKey] || DOCS_REGISTRY['ARCHITECTURE.md'];

  // Configure marked renderer for rich IDE-style code blocks
  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    const language = lang || 'javascript';
    let highlighted = text;
    try {
      if (Prism.languages[language]) {
        highlighted = Prism.highlight(text, Prism.languages[language], language);
      } else if (Prism.languages.javascript) {
        highlighted = Prism.highlight(text, Prism.languages.javascript, 'javascript');
      }
    } catch (e) {
      highlighted = text;
    }

    return `
      <div class="my-5 rounded-xl border border-zinc-800 bg-[#070b14] overflow-hidden shadow-2xl font-mono text-xs group/code">
        <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/90 text-[11px]">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40"></span>
            <span class="ml-2 font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">${language}</span>
          </div>
          <div class="text-[10px] text-zinc-500 font-mono">JS Workspace IDE Sandbox</div>
        </div>
        <div class="p-4 overflow-x-auto leading-relaxed text-zinc-200 bg-[#070b14]">
          <pre class="m-0 p-0 bg-transparent border-0"><code class="language-${language} bg-transparent p-0 border-0">${highlighted}</code></pre>
        </div>
      </div>
    `;
  };

  // Parse markdown into sanitized HTML
  const rawHtml = marked.parse(activeDoc.content, {
    renderer,
    gfm: true,
    breaks: true
  }) as string;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[88vh] h-[85vh] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-sans flex items-center gap-2">
                Documentation & Architecture Manual
              </h3>
              <p className="text-xs text-muted-foreground">
                In-depth guides for Web Worker sandboxes, dynamic JSDoc UI, Node polyfills, and CORS extension
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/10 px-6 py-2 shrink-0 overflow-x-auto">
          {Object.values(DOCS_REGISTRY).map(doc => {
            const isActive = doc.id === activeDocKey;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDocKey(doc.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>{doc.title.split('&')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Markdown Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-foreground bg-background/50">
          <article className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4
            [&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-primary [&_h1]:border-b [&_h1]:border-border/40 [&_h1]:pb-2 [&_h1]:mb-4
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-2
            [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1
            [&_p]:text-muted-foreground [&_p]:leading-relaxed
            [&_code]:bg-zinc-950 [&_code]:text-emerald-400 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_code]:border [&_code]:border-zinc-800
            [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:border-0
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_th]:bg-muted/60 [&_th]:border [&_th]:border-border/60 [&_th]:p-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:text-foreground
            [&_td]:border [&_td]:border-border/40 [&_td]:p-2.5 [&_td]:text-xs [&_td]:text-muted-foreground
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-muted-foreground
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:text-muted-foreground
            [&_blockquote]:border-l-4 [&_blockquote]:border-primary/60 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
            "
            dangerouslySetInnerHTML={{ __html: rawHtml }}
          />
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-6 py-3 shrink-0">
          <div className="text-xs text-muted-foreground font-mono">
            Reading: <span className="text-primary font-bold">{activeDoc.id}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
