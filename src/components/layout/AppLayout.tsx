import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar, MobileNav } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '../ui/Toaster';
import { ConfirmDialog } from '../ui/Modal';
import { IncidentFormModal } from '../incidents/IncidentForm';
import { useApp } from '../../context/store';
import { SignalResolver, AutoSimulation, ThemeSync } from './Runners';
import { CursorGlow } from './CursorGlow';
import { CursorTrail } from './CursorTrail';
import { cn } from '../../utils/cn';
import { ErrorBoundary } from '../../app/ErrorBoundary';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('epre-sidebar') === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const createOpen = useApp((s) => s.createOpen);
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const resetDemo = useApp((s) => s.resetDemo);
  const density = useApp((s) => s.settings.density);
  const location = useLocation();
  const fullBleed = location.pathname === '/map';

  const toggle = () => setCollapsed((v) => {
    try { localStorage.setItem('epre-sidebar', v ? '0' : '1'); } catch { /* storage unavailable */ }
    return !v;
  });

  return (
    <div className={cn('h-full flex bg-bg', density === 'compact' && 'density-compact')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:left-2 focus:top-2 focus:bg-card focus:px-3 focus:py-2 focus:rounded">Skip to content</a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenu={() => setMobileOpen(true)} onReset={() => setResetOpen(true)} />
        <main id="main" className={cn('flex-1 min-h-0 relative print-area', fullBleed ? 'overflow-hidden' : 'overflow-y-auto scroll-thin')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname.split('/')[1] ?? ''}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className={cn(fullBleed ? 'h-full' : 'p-3 sm:p-5 max-w-[1680px] mx-auto')}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <IncidentFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => { resetDemo(); setResetOpen(false); }}
        title="Reset demo data?"
        tone="danger"
        confirmLabel="Reset to demo defaults"
        body="All incidents, assignments, signal requests and notifications will be restored to the original seeded dataset. Settings are kept."
      />
      <Toaster />
      <SignalResolver />
      <AutoSimulation />
      <ThemeSync />
      <CursorGlow />
      <CursorTrail />
    </div>
  );
}
