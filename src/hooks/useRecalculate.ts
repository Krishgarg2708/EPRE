import { useState } from 'react';
import { useApp } from '../context/store';
import { analyzeIncident } from '../utils/analysis';
import { useAnalysisCtx, type RouteAnalysis } from './useRoutes';
import type { Incident } from '../types';

/** Runs the deterministic route model against the current simulated inputs, with a short visible calculation state. */
export function useRecalculate(incident: Incident | undefined, current: RouteAnalysis | null) {
  const [busy, setBusy] = useState(false);
  const ctx = useAnalysisCtx();
  const record = useApp((s) => s.recordRecalculation);
  const run = () => {
    if (!incident || busy) return;
    setBusy(true);
    setTimeout(() => {
      const fresh = analyzeIncident(incident, ctx);
      if (fresh) record(incident.id, fresh.best.id, !!current && current.best.id !== fresh.best.id);
      setBusy(false);
    }, 650);
  };
  return { busy, run };
}
