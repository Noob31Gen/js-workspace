import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Terminal, Code2, BookOpen, ExternalLink } from 'lucide-react';
import { checkExtensionConnected } from '@/lib/extension-client';

interface HeaderProps {
  onOpenDocs: (docName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDocs }) => {
  const [extensionActive, setExtensionActive] = useState<boolean>(false);

  useEffect(() => {
    const verifyExtension = async () => {
      const active = await checkExtensionConnected();
      setExtensionActive(active);
    };

    verifyExtension();
    const interval = setInterval(verifyExtension, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Terminal className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg flex items-center gap-2">
            JS Workspace
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border">
              v1.0 Template
            </span>
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Browser Script Sandbox & Parameter Inspector
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Extension Connection Status Badge */}
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          extensionActive 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {extensionActive ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CORS Helper Connected</span>
              <span className="sm:hidden">CORS OK</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CORS Helper Inactive</span>
              <span className="sm:hidden">No CORS</span>
            </>
          )}
        </div>

        {/* Documentation Buttons */}
        <button
          onClick={() => onOpenDocs('ARCHITECTURE.md')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Docs</span>
        </button>

        <a
          href="https://github.com/Noob31Gen/noob31-multitool"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Noob31 Design</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>
    </header>
  );
};
