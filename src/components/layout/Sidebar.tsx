import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV } from './nav';
import { BrandMark } from './Brand';
import { cn } from '../../utils/cn';
import { useApp } from '../../context/store';
import { useOpenIncidents } from '../../hooks/useEntities';

function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const open = useOpenIncidents();
  const awaiting = open.filter((i) => i.status === 'New' || i.status === 'Awaiting Assignment').length;
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto scroll-thin px-2 py-3 space-y-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-md px-2.5 h-9 text-[13px] transition-colors',
              isActive ? 'bg-cyan/10 text-ink' : 'text-mute hover:text-ink hover:bg-card',
              collapsed && 'justify-center px-0',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-cyan" aria-hidden />}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-cyan')} aria-hidden />
              {!collapsed && <span className="truncate">{label}</span>}
              {to === '/incidents' && awaiting > 0 && (
                <span className={cn('ml-auto rounded bg-red/15 text-red text-[10px] font-semibold px-1.5 py-0.5 tabular-nums', collapsed && 'absolute -top-0.5 right-0.5 ml-0 px-1')} aria-label={`${awaiting} incidents awaiting assignment`}>
                  {awaiting}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const sim = useApp((s) => s.settings.simulationMode);
  return (
    <aside className={cn('hidden md:flex flex-col shrink-0 bg-side border-r border-line transition-[width] duration-200', collapsed ? 'w-[64px]' : 'w-[244px]')}>
      <div className={cn('h-14 flex items-center gap-2.5 border-b border-line', collapsed ? 'justify-center' : 'px-4')}>
        <BrandMark />
        {!collapsed && (
          <div className="leading-tight min-w-0">
            <div className="font-bold tracking-[0.18em] text-[15px]">EPRE</div>
            <div className="text-[10px] text-mute truncate">Emergency Priority Routing Engine</div>
          </div>
        )}
      </div>
      <NavItems collapsed={collapsed} />
      <div className="border-t border-line p-2 space-y-2">
        {!collapsed && (
          <div className="rounded-md bg-card/60 border border-line px-3 py-2 text-[11px] text-mute">
            <div className="flex items-center gap-1.5 text-amber font-semibold tracking-wider text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber live-dot" aria-hidden />DEMO SIMULATION
            </div>
            <p className="mt-1">Prototype only. No real ambulances, hospitals or signals are connected.</p>
            <p className="mt-1">Mode: <span className="text-ink">{sim === 'auto' ? 'Auto-progress (demo)' : 'Manual'}</span></p>
          </div>
        )}
        <button onClick={onToggle} className="w-full h-8 flex items-center justify-center gap-2 rounded-md text-mute hover:text-ink hover:bg-card text-xs" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse</>}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[950] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
          <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ duration: 0.18 }} className="absolute left-0 top-0 h-full w-[264px] bg-side border-r border-line flex flex-col" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="h-14 flex items-center justify-between px-4 border-b border-line">
              <div className="flex items-center gap-2.5"><BrandMark /><span className="font-bold tracking-[0.18em]">EPRE</span></div>
              <button onClick={onClose} aria-label="Close navigation" className="text-mute hover:text-ink"><X className="h-5 w-5" /></button>
            </div>
            <NavItems collapsed={false} onNavigate={onClose} />
            <p className="p-4 text-[11px] text-amber border-t border-line">DEMO SIMULATION — no real emergency services connected.</p>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
