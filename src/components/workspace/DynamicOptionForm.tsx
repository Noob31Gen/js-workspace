import React from 'react';
import { OptionDescriptor } from '@/lib/parser';
import { Sliders, RotateCcw, Sparkles, HelpCircle, Check, Info } from 'lucide-react';

interface DynamicOptionFormProps {
  options: OptionDescriptor[];
  values: Record<string, any>;
  onChangeValue: (key: string, value: any) => void;
  onResetDefaults?: () => void;
}

export const DynamicOptionForm: React.FC<DynamicOptionFormProps> = ({
  options,
  values,
  onChangeValue,
  onResetDefaults
}) => {
  if (!options || options.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5 text-center space-y-2">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Sliders className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No Parameters Detected</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Add <code className="text-primary font-mono text-[11px]">@param &#123;type&#125; key Label</code> JSDoc comments or destructured <code className="text-primary font-mono text-[11px]">run(&#123; arg &#125;)</code> parameters to auto-generate form controls.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Sliders className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Script Parameters ({options.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Detected from JSDoc & Function Signature
            </p>
          </div>
        </div>

        {onResetDefaults && (
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
            title="Reset options to script default values"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const val = values[opt.key] !== undefined ? values[opt.key] : opt.default;

          return (
            <div key={opt.key} className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:border-border/80 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`input-${opt.key}`} className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>{opt.label || opt.key}</span>
                  <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    {opt.key}
                  </code>
                </label>

                <div className="flex items-center gap-1">
                  {opt.source === 'autodetected' && (
                    <span className="rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5 text-[9px] font-medium border border-amber-500/20">
                      Auto-Detected
                    </span>
                  )}
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-mono font-semibold border border-primary/20">
                    {opt.type}
                  </span>
                </div>
              </div>

              {/* String Input */}
              {opt.type === 'string' && (
                <input
                  id={`input-${opt.key}`}
                  type="text"
                  value={val}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* Number Input */}
              {opt.type === 'number' && (
                <input
                  id={`input-${opt.key}`}
                  type="number"
                  value={val}
                  onChange={(e) => onChangeValue(opt.key, Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* Range Slider */}
              {opt.type === 'range' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>{opt.min ?? 0}</span>
                    <span className="text-primary font-bold">{val}</span>
                    <span>{opt.max ?? 100}</span>
                  </div>
                  <input
                    id={`input-${opt.key}`}
                    type="range"
                    min={opt.min ?? 0}
                    max={opt.max ?? 100}
                    step={opt.step ?? 1}
                    value={val}
                    onChange={(e) => onChangeValue(opt.key, Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              )}

              {/* Boolean Switch */}
              {opt.type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    id={`input-${opt.key}`}
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => onChangeValue(opt.key, e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-medium">
                    {val ? 'Enabled (true)' : 'Disabled (false)'}
                  </span>
                </label>
              )}

              {/* Select Dropdown */}
              {opt.type === 'select' && (
                <select
                  id={`input-${opt.key}`}
                  value={val}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {(opt.options || []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}

              {/* Multiline Text Area */}
              {opt.type === 'text' && (
                <textarea
                  id={`input-${opt.key}`}
                  rows={3}
                  value={val}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* Color Picker */}
              {opt.type === 'color' && (
                <div className="flex items-center gap-3">
                  <input
                    id={`input-${opt.key}`}
                    type="color"
                    value={val || '#3b82f6'}
                    onChange={(e) => onChangeValue(opt.key, e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border border-border bg-background p-0.5"
                  />
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => onChangeValue(opt.key, e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground font-mono"
                  />
                </div>
              )}

              {/* JSON Input */}
              {opt.type === 'json' && (
                <textarea
                  id={`input-${opt.key}`}
                  rows={4}
                  value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      onChangeValue(opt.key, parsed);
                    } catch (err) {
                      onChangeValue(opt.key, e.target.value);
                    }
                  }}
                  className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder='{"key": "value"}'
                />
              )}

              {opt.description && (
                <p className="text-[10px] text-muted-foreground/80 italic pt-0.5">
                  {opt.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
