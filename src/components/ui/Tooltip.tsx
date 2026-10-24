import { useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

export function Tooltip({ content, children }: { content: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="More information"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center text-mute hover:text-ink"
      >
        {children ?? <Info className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {open && (
        <span role="tooltip" id={id} className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-md border border-line bg-card px-3 py-2 text-[11px] leading-relaxed text-ink shadow-xl normal-case tracking-normal font-normal">
          {content}
        </span>
      )}
    </span>
  );
}
