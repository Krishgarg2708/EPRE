import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function Panel({ title, icon, actions, children, className, bodyClass, subtitle }: {
  title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; subtitle?: ReactNode;
}) {
  return (
    <section className={cn('panel flex flex-col min-w-0', className)}>
      {(title || actions) && (
        <header className="panel-head">
          <div className="min-w-0">
            <h2 className="panel-title">
              {icon && <span className="text-cyan" aria-hidden>{icon}</span>}
              {title}
            </h2>
            {subtitle && <p className="text-[11px] text-mute mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn('flex-1 min-h-0', bodyClass)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 gap-2">
      {icon && <div className="text-mute/70 mb-1" aria-hidden>{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {body && <p className="text-xs text-mute max-w-xs">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-card', className)} aria-hidden />;
}

export function KV({ k, v, mono }: { k: ReactNode; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[13px] border-b border-line/50 last:border-0">
      <span className="text-mute shrink-0">{k}</span>
      <span className={cn('text-right text-ink min-w-0', mono && 'font-mono text-xs')}>{v}</span>
    </div>
  );
}
