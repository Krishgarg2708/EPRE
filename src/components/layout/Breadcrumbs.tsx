import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { NAV } from './nav';

export function Breadcrumbs({ extra }: { extra?: string }) {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const root = NAV.find((n) => n.to === `/${parts[0] ?? ''}`) ?? NAV[0];
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-mute">
      <Link to="/" className="hover:text-ink">EPRE</Link>
      <ChevronRight className="h-3 w-3" aria-hidden />
      {parts.length > 1 || extra ? <Link to={root.to} className="hover:text-ink">{root.label}</Link> : <span className="text-ink" aria-current="page">{root.label}</span>}
      {(parts[1] || extra) && (
        <>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-ink" aria-current="page">{extra ?? parts[1]}</span>
        </>
      )}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions, crumb }: { title: string; subtitle?: ReactNode; actions?: ReactNode; crumb?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        <Breadcrumbs extra={crumb} />
        <h1 className="text-xl font-semibold mt-1 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-mute mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  );
}
