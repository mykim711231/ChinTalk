import type { ReactNode } from 'react';

export const cn = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');

export function SectionHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mt-6 mb-2 border-b border-slate-200 pb-2">
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-tight inline-flex items-center gap-2">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white', className)}>{children}</div>;
}

export function Row({
  label, description, children, stack,
}: { label: string; description?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={cn('gap-3 px-4 py-3', stack ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between' : 'flex items-center justify-between')}>
      <div className="min-w-0 flex-1">
        <span>{label}</span>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className={stack ? 'w-full sm:w-auto' : 'shrink-0'}>{children}</div>
    </div>
  );
}

export function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', on ? 'bg-brand' : 'bg-slate-300')}
    >
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, grid,
}: { value: T; options: Array<{ v: T; l: string }>; onChange: (v: T) => void; grid?: boolean }) {
  return (
    <div className={grid
      ? 'grid w-full grid-cols-1 sm:grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1'
      : 'inline-flex flex-wrap gap-y-0.5 rounded-3xl border border-slate-200 bg-slate-50 p-0.5'}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn('px-3 py-1.5 text-sm font-semibold', grid ? 'rounded-xl text-left' : 'rounded-full', value === o.v ? 'bg-brand text-white' : 'text-slate-500')}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
