import React from 'react';
import { Play, Code, FileText, Settings, Plus, Sparkles, FolderOpen, BookOpen } from 'lucide-react';

interface ScriptItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface SidebarProps {
  scripts: ScriptItem[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onNewScript: () => void;
  onSelectDoc: (doc: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  scripts,
  activeScriptId,
  onSelectScript,
  onNewScript,
  onSelectDoc
}) => {
  return (
    <aside className="w-64 shrink-0 border-r border-border/60 bg-muted/10 p-4 flex flex-col justify-between hidden md:flex h-[calc(100vh-4rem)]">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* New Script Button */}
        <div>
          <button
            onClick={onNewScript}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Blank Script
          </button>
        </div>

        {/* Script Templates & User Workspace Files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-2">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              Workspace Scripts
            </span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{scripts.length}</span>
          </div>

          <div className="space-y-1">
            {scripts.map((script) => {
              const isActive = script.id === activeScriptId;
              return (
                <button
                  key={script.id}
                  onClick={() => onSelectScript(script.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-start gap-2.5 border ${
                    isActive
                      ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <Code className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="overflow-hidden">
                    <div className="truncate font-semibold">{script.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground/80">{script.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Technical Documentation Section */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Documentation
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelectDoc('ARCHITECTURE.md')}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5" />
              Architecture Specs
            </button>
            <button
              onClick={() => onSelectDoc('SCRIPT_SPECIFICATION.md')}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Option & JSDoc Guide
            </button>
            <button
              onClick={() => onSelectDoc('EXTENSION_INTEGRATION.md')}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center gap-2"
            >
              <Settings className="h-3.5 w-3.5" />
              CORS Extension Bridge
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-border/40 text-[11px] text-muted-foreground/60 flex items-center justify-between">
        <span>Noob31 MultiTools UI</span>
        <span className="font-mono">React 19 + Vite</span>
      </div>
    </aside>
  );
};
