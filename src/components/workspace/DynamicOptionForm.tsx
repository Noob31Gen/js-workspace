import React from 'react';
import { OptionDescriptor } from '@/lib/parser';
import { Sliders, RotateCcw } from 'lucide-react';

interface DynamicOptionFormProps {
  options: OptionDescriptor[];
  values: Record<string, unknown>;
  onChangeValue: (key: string, value: unknown) => void;
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
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex flex-col h-full min-h-0 flex-1 md:h-[520px] min-w-0 max-w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
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

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-3">
        {options.map((opt) => {
          const val = values[opt.key] !== undefined ? values[opt.key] : opt.default;

          return (
            <div key={opt.key} className="space-y-2 p-3 rounded-xl bg-card border border-border/60 hover:border-border/80 transition-colors shadow-xs">
              <div className="space-y-1 select-none pb-0.5">
                {/* Line 1: Parameter Display Label */}
                <label
                  htmlFor={`input-${opt.key}`}
                  className="text-xs font-bold text-foreground font-sans leading-snug block break-words"
                  title={opt.label || opt.key}
                >
                  {opt.label || opt.key}
                </label>

                {/* Line 2: Technical Badges (Key, Source, Type) */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                    {opt.key}
                  </code>

                  {opt.source === 'autodetected' && (
                    <span
                      className="rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5 text-[9px] font-medium border border-amber-500/20 whitespace-nowrap shrink-0 cursor-help"
                      title="Parameter auto-detected from code property usage"
                    >
                      Auto
                    </span>
                  )}

                  <span
                    className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-mono font-bold border border-primary/20 whitespace-nowrap shrink-0 cursor-help"
                    title={`Parameter data type: ${opt.type}`}
                  >
                    {opt.type}
                  </span>
                </div>
              </div>

              {/* String Input */}
              {opt.type === 'string' && (
                <input
                  id={`input-${opt.key}`}
                  type="text"
                  value={String(val ?? '')}
                  placeholder={opt.default ? String(opt.default) : 'Enter text value...'}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              )}

              {/* Number Input */}
              {opt.type === 'number' && (
                <input
                  id={`input-${opt.key}`}
                  type="number"
                  value={(val as string | number | undefined) ?? ''}
                  placeholder={String(opt.default ?? '')}
                  onChange={(e) => onChangeValue(opt.key, e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              )}

              {/* Range Slider */}
              {opt.type === 'range' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>{opt.min ?? 0}</span>
                    <span className="text-primary font-bold">{String(val ?? (opt.min ?? 0))}</span>
                    <span>{opt.max ?? 100}</span>
                  </div>
                  <input
                    id={`input-${opt.key}`}
                    type="range"
                    min={opt.min ?? 0}
                    max={opt.max ?? 100}
                    step={opt.step ?? 1}
                    value={(val as number | undefined) ?? (opt.min ?? 0)}
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
                  <span className="text-xs text-foreground font-semibold">
                    {val ? 'Enabled (true)' : 'Disabled (false)'}
                  </span>
                </label>
              )}

              {/* Select Dropdown */}
              {opt.type === 'select' && (
                <select
                  id={`input-${opt.key}`}
                  value={String(val ?? (opt.options?.[0] || ''))}
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
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
                  value={String(val ?? '')}
                  placeholder="Enter multiline text..."
                  onChange={(e) => onChangeValue(opt.key, e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background p-2.5 text-xs text-foreground font-mono font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
              )}

              {/* Color Picker */}
              {opt.type === 'color' && (
                <div className="flex items-center gap-3">
                  <input
                    id={`input-${opt.key}`}
                    type="color"
                    value={String(val || '#3b82f6')}
                    onChange={(e) => onChangeValue(opt.key, e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border border-border bg-background p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={String(val ?? '')}
                    onChange={(e) => onChangeValue(opt.key, e.target.value)}
                    className="flex-1 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono font-semibold shadow-xs"
                  />
                </div>
              )}

              {/* JSON Input */}
              {opt.type === 'json' && (
                <textarea
                  id={`input-${opt.key}`}
                  rows={4}
                  value={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '')}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      onChangeValue(opt.key, parsed);
                    } catch {
                      onChangeValue(opt.key, e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-border/80 bg-background p-2.5 text-xs text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  placeholder='{"key": "value"}'
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
