import type { ReactNode } from 'react';
import { FlaskConical, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SimTag({ children = 'SIMULATED', className }: { children?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber', className)}>
      <FlaskConical className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

export function Disclaimer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-md border border-amber/30 bg-amber/[0.07] px-3 py-2 text-xs text-amber', className)} role="note">
      <ShieldAlert className="h-4 w-4 shrink-0 mt-px" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
