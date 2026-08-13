import React from 'react';
import { Code2, Sliders, Terminal, Layout } from 'lucide-react';

export type MobileTab = 'editor' | 'params' | 'console' | 'preview';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  logCount: number;
  paramCount: number;
  hasFrame: boolean;
  inputPrompt?: string | null;
  hasError?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  logCount,
  paramCount,
  hasFrame,
  inputPrompt,
  hasError
}) => {
  const tabs = [
    { id: 'editor' as MobileTab, label: 'Editor', icon: Code2, badge: null },
    { id: 'params' as MobileTab, label: 'Params', icon: Sliders, badge: paramCount > 0 ? paramCount : null },
    { id: 'console' as MobileTab, label: 'Console', icon: Terminal, badge: logCount > 0 ? logCount : null },
    { id: 'preview' as MobileTab, label: 'Preview', icon: Layout, isPing: hasFrame },
  ];

  return (
    <nav className="h-14 shrink-0 border-t border-border/60 bg-card/95 backdrop-blur-xl flex items-center justify-around px-2 z-40 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all cursor-pointer ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              
              {tab.id === 'console' ? (
                (inputPrompt || hasError || logCount > 0) && (
                  <span className={`absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-mono font-bold shadow-xs transition-all ${
                    inputPrompt
                      ? 'bg-amber-500 text-amber-950 font-black animate-pulse ring-2 ring-amber-400/50'
                      : hasError
                      ? 'bg-destructive text-destructive-foreground font-bold ring-2 ring-destructive/40'
                      : 'bg-primary text-primary-foreground font-bold'
                  }`}>
                    {inputPrompt ? (logCount > 0 ? logCount : '!') : logCount}
                  </span>
                )
              ) : (
                tab.badge !== null && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono font-bold text-primary-foreground shadow-xs">
                    {tab.badge}
                  </span>
                )
              )}

              {tab.isPing && tab.id === 'preview' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </div>

            <span className="text-[10px] tracking-tight mt-0.5 font-medium">{tab.label}</span>

            {isActive && (
              <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
