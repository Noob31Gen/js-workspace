import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  scripts: any[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onNewScript: () => void;
  onSelectDoc: (doc: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  scripts,
  activeScriptId,
  onSelectScript,
  onNewScript,
  onSelectDoc
}) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header onOpenDocs={onSelectDoc} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          scripts={scripts}
          activeScriptId={activeScriptId}
          onSelectScript={onSelectScript}
          onNewScript={onNewScript}
          onSelectDoc={onSelectDoc}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
