import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Siren, Ambulance, Hospital, TrafficCone } from 'lucide-react';
import { useApp, TRAFFIC } from '../../context/store';
import { cn } from '../../utils/cn';

interface Result { key: string; label: string; sub: string; path: string; kind: 'Incident' | 'Ambulance' | 'Hospital' | 'Traffic segment' }
const ICON = { Incident: Siren, Ambulance, Hospital, 'Traffic segment': TrafficCone };

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const incidents = useApp((s) => s.incidents);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const r: Result[] = [];
    for (const i of incidents) if ([i.id, i.location, i.type, i.area, i.priority].some((v) => v.toLowerCase().includes(s))) r.push({ key: i.id, label: `${i.id} · ${i.type}`, sub: `${i.priority} · ${i.status} · ${i.location}`, path: `/incidents/${i.id}`, kind: 'Incident' });
    for (const a of ambulances) if ([a.id, a.callSign, a.base, a.status].some((v) => v.toLowerCase().includes(s))) r.push({ key: a.id, label: `${a.id} · ${a.callSign}`, sub: `${a.type} · ${a.status} · ${a.base}`, path: `/fleet?id=${a.id}`, kind: 'Ambulance' });
    for (const h of hospitals) if ([h.id, h.name, h.area, ...h.capabilities].some((v) => v.toLowerCase().includes(s))) r.push({ key: h.id, label: h.name, sub: `${h.area} · ${h.edStatus}`, path: `/hospitals?id=${h.id}`, kind: 'Hospital' });
    for (const t of TRAFFIC) if ([t.name, t.corridor].some((v) => v.toLowerCase().includes(s))) r.push({ key: t.id, label: t.name, sub: t.corridor, path: `/traffic?segment=${t.id}`, kind: 'Traffic segment' });
    return r.slice(0, 10);
  }, [q, incidents, ambulances, hospitals]);

  const go = (r: Result) => {
    navigate(r.path);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-bg/60 border border-line focus-within:border-cyan">
        <Search className="h-4 w-4 text-mute shrink-0" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter' && results[active]) go(results[active]);
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder="Search incidents, units, hospitals, roads…"
          aria-label="Global search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="global-search-results"
          className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-mute/70"
        />
        <kbd className="hidden lg:inline text-[10px] text-mute border border-line rounded px-1.5 py-0.5 font-mono">Ctrl K</kbd>
      </div>
      {open && q.trim() && (
        <ul id="global-search-results" role="listbox" className="absolute left-0 right-0 mt-1 panel bg-card shadow-2xl py-1 z-[700] max-h-96 overflow-auto scroll-thin">
          {results.length === 0 && <li className="px-3 py-3 text-xs text-mute">No matches for “{q}”.</li>}
          {results.map((r, i) => {
            const I = ICON[r.kind];
            return (
              <li key={`${r.kind}-${r.key}`} role="option" aria-selected={i === active}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => go(r)} onMouseEnter={() => setActive(i)} className={cn('w-full flex items-start gap-3 text-left px-3 py-2', i === active && 'bg-surface')}>
                  <I className="h-4 w-4 mt-0.5 text-cyan shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-[13px] truncate">{r.label}</div>
                    <div className="text-[11px] text-mute truncate">{r.kind} · {r.sub}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
