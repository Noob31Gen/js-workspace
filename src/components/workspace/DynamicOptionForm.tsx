import React from 'react';
import { Sliders, HelpCircle } from 'lucide-react';
import { OptionDescriptor } from '@/lib/parser';

interface DynamicOptionFormProps {
  options: OptionDescriptor[];
  values: Record<string, any>;
  onChangeValue: (key: string, value: any) => void;
}

export const DynamicOptionForm: React.FC<DynamicOptionFormProps> = ({
  options,
  values,
  onChangeValue
}) => {
  if (!options || options.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-xs text-muted-foreground">
        <Sliders className="h-6 w-6 mx-auto mb-2 opacity-40 text-primary" />
        <p className="font-semibold text-foreground">No JSDoc Parameters Detected</p>
        <p className="mt-1 max-w-xs mx-auto text-muted-foreground/80">
          Add <code className="text-primary font-mono">@param {'{type}'} name - default: "val"</code> comments at top of script to automatically build form inputs!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Detected Options & Arguments ({options.length})
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground">Auto-generated Form</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const val = values[opt.key] !== undefined ? values[opt.key] : opt.default;

          return (
            <div key={opt.key} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>{opt.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground/70">({opt.key})</span>
              </label>

              {opt.type === 'string' && (
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                />
              )}

              {opt.type === 'text' && (
                <textarea
                  value={val || ''}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono resize-none"
                />
              )}

              {opt.type === 'number' && (
                <input
                  type="number"
                  value={val !== undefined ? val : 0}
                  onChange={(e) => onChangeValue(opt.key, Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                />
              )}

              {opt.type === 'boolean' && (
                <div className="flex items-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => onChangeValue(opt.key, !val)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      val ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        val ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-muted-foreground font-mono">{val ? 'true' : 'false'}</span>
                </div>
              )}

              {opt.type === 'select' && (
                <select
                  value={val || ''}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                >
                  {opt.options?.map((o) => (
                    <option key={o} value={o} className="bg-zinc-900 text-foreground">
                      {o}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
