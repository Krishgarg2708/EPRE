import { useEffect, useRef } from 'react';
import { useApp } from '../../context/store';
import { rankHospitals } from '../../utils/recommend';

/** Resolves simulated signal-priority requests after a short, fixed delay. Outcome is deterministic. */
export function SignalResolver() {
  const pending = useApp((s) => s.signalRequests.filter((r) => r.status === 'Simulated Request Pending').map((r) => r.id).join(','));
  const resolve = useApp((s) => s.resolveSignal);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const ids = pending ? pending.split(',') : [];
    for (const id of ids) {
      if (!timers.current.has(id)) timers.current.set(id, setTimeout(() => { resolve(id); timers.current.delete(id); }, 2600));
    }
  }, [pending, resolve]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return null;
}

/** Optional, clearly-labelled auto-progress mode for unattended demos. Off by default. */
export function AutoSimulation() {
  const mode = useApp((s) => s.settings.simulationMode);
  useEffect(() => {
    if (mode !== 'auto') return;
    const t = setInterval(() => {
      const st = useApp.getState();
      const order = ['Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital'];
      const candidates = st.incidents.filter((i) => i.ambulanceId && order.includes(i.status)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (const inc of candidates) {
        if (inc.status === 'At Pickup' && !inc.hospitalId) {
          const best = rankHospitals(inc, st.hospitals).find((h) => h.eligible && h.hospital.edStatus !== 'Unknown');
          if (best) st.setHospital(inc.id, best.hospital.id);
        }
        const res = useApp.getState().advanceIncident(inc.id);
        if (res.ok) break;
      }
    }, 15000);
    return () => clearInterval(t);
  }, [mode]);
  return null;
}

export function ThemeSync() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
  }, [theme]);
  return null;
}
