import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Plus, ChevronDown, Moon, Sun, Settings as SettingsIcon, RotateCcw, UserCircle2 } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsButton } from './NotificationsPanel';
import { Button } from '../ui/Button';
import { useApp } from '../../context/store';
import { useNow } from '../../hooks/useNow';
import { BrandMark } from './Brand';

function Clock() {
  const now = useNow(1000);
  const d = new Date(now);
  return (
    <div className="hidden lg:flex flex-col items-end leading-tight" aria-label="Current date and time">
      <span className="font-mono text-[13px] tabular-nums">{d.toLocaleTimeString('en-IN', { hour12: false })}</span>
      <span className="text-[10px] text-mute">{d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · IST</span>
    </div>
  );
}

function ProfileMenu({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const theme = useApp((s) => s.settings.theme);
  const update = useApp((s) => s.updateSettings);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-md hover:bg-card">
        <span className="h-7 w-7 rounded-full bg-blue/20 text-blue grid place-items-center text-[11px] font-semibold">OP</span>
        <span className="hidden xl:flex flex-col items-start leading-tight">
          <span className="text-xs">Demo Operator</span>
          <span className="text-[10px] text-mute">Dispatch Desk 1</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-mute" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 panel bg-surface shadow-2xl py-1 z-[750]">
          <div className="px-3 py-2 border-b border-line">
            <div className="flex items-center gap-2 text-sm"><UserCircle2 className="h-4 w-4 text-mute" />Demo Operator</div>
            <div className="text-[11px] text-mute">Simulated session · no authentication</div>
          </div>
          <button role="menuitem" onClick={() => update({ theme: theme === 'dark' ? 'light' : 'dark' })} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-card">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}Switch to {theme === 'dark' ? 'light' : 'dark'} theme
          </button>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-card"><SettingsIcon className="h-4 w-4" />Settings</Link>
          <button role="menuitem" onClick={() => { setOpen(false); onReset(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-card text-amber"><RotateCcw className="h-4 w-4" />Reset demo data…</button>
        </div>
      )}
    </div>
  );
}

export function Header({ onMenu, onReset }: { onMenu: () => void; onReset: () => void }) {
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  return (
    <header className="relative z-[60] h-14 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 border-b border-line bg-side/80 backdrop-blur no-print">
      <button onClick={onMenu} className="md:hidden h-9 w-9 grid place-items-center rounded-md text-mute hover:text-ink hover:bg-card" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <div className="md:hidden"><BrandMark size={26} /></div>
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded border border-amber/40 bg-amber/10 px-2 h-6 text-[10px] font-semibold tracking-[0.12em] text-amber shrink-0" title="All data in this application is simulated">
        <span className="h-1.5 w-1.5 rounded-full bg-amber live-dot" aria-hidden />DEMO SIMULATION
      </span>
      <div className="flex-1 min-w-0 flex justify-center"><GlobalSearch /></div>
      <Clock />
      <Button variant="danger" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)} className="shrink-0" aria-label="Create new incident">
        <span className="hidden sm:inline">New Incident</span>
      </Button>
      <NotificationsButton />
      <ProfileMenu onReset={onReset} />
    </header>
  );
}
