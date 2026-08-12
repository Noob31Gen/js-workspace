import React from 'react';

interface MobileSymbolBarProps {
  onInsertSymbol: (symbol: string) => void;
}

export const MobileSymbolBar: React.FC<MobileSymbolBarProps> = ({ onInsertSymbol }) => {
  const symbols = [
    { label: '{ }', value: '{}' },
    { label: '( )', value: '()' },
    { label: '[ ]', value: '[]' },
    { label: '=>', value: '=> ' },
    { label: ';', value: ';' },
    { label: '=', value: ' = ' },
    { label: ':', value: ': ' },
    { label: 'const', value: 'const ' },
    { label: 'let', value: 'let ' },
    { label: 'fn', value: 'function ' },
    { label: 'log', value: 'console.log(' },
    { label: 'return', value: 'return ' },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 bg-muted/90 border-t border-border/60 shrink-0 select-none no-scrollbar">
      {symbols.map((s, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onInsertSymbol(s.value)}
          className="px-2.5 py-1 rounded-md bg-background border border-border/80 text-foreground font-mono text-xs font-semibold shadow-xs hover:bg-muted active:scale-95 transition-all whitespace-nowrap shrink-0"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};
