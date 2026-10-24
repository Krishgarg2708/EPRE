import { useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Field({ label, error, hint, children, required, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="label flex items-center gap-1">
        {label}
        {required && <span className="text-red" aria-hidden>*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-red" role="alert">{error}</p> : hint ? <p className="text-[11px] text-mute">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn('input', invalid && 'border-red', className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn('input h-auto py-2 min-h-[72px] resize-y', invalid && 'border-red', className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Select({ className, children, invalid, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn('input pr-8 cursor-pointer', invalid && 'border-red', className)} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm text-ink cursor-pointer">{label}</label>
        {description && <p className="text-xs text-mute">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-40', checked ? 'bg-cyan/80 border-cyan' : 'bg-card border-line')}
      >
        <span className={cn('absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'sm' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; size?: 'xs' | 'sm' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-bg/50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-2.5 transition-colors whitespace-nowrap',
            size === 'xs' ? 'h-6 text-[11px]' : 'h-7 text-xs',
            value === o.value ? 'bg-card text-ink shadow-sm border border-line' : 'text-mute hover:text-ink border border-transparent',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
