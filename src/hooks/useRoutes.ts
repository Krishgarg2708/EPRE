import { useMemo } from 'react';
import { useApp } from '../context/store';
import { analyzeIncident, remainingEta, type RouteAnalysis, type AnalysisContext } from '../utils/analysis';
import type { Incident } from '../types';

export type { RouteAnalysis };

export function useAnalysisCtx(): AnalysisContext {
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const slice = useApp((s) => s.trafficSlice);
  const weights = useApp((s) => s.settings.weights);
  const signals = useApp((s) => s.signalRequests);
  return useMemo(() => ({ ambulances, hospitals, slice, weights, signals }), [ambulances, hospitals, slice, weights, signals]);
}

/**
 * Route analysis for one incident, using the traffic snapshot from its last calculation.
 * `stale` is true when the global simulated traffic snapshot has changed since then.
 */
export function useRoutes(incident: Incident | undefined): (RouteAnalysis & { stale: boolean }) | null {
  const ctx = useAnalysisCtx();
  const calcSlice = useApp((s) => (incident ? s.calcSlice[incident.id] : undefined));
  return useMemo(() => {
    if (!incident) return null;
    const used = calcSlice ?? ctx.slice;
    const a = analyzeIncident(incident, { ...ctx, slice: used });
    return a ? { ...a, stale: used !== ctx.slice } : null;
  }, [incident, ctx, calcSlice]);
}

/** Simulated remaining ETAs for many incidents at once (tables, queues). */
export function useEtas(incidents: Incident[]): Record<string, number | undefined> {
  const ctx = useAnalysisCtx();
  const calcSlice = useApp((s) => s.calcSlice);
  return useMemo(() => {
    const out: Record<string, number | undefined> = {};
    for (const i of incidents) out[i.id] = i.ambulanceId ? remainingEta(i, analyzeIncident(i, { ...ctx, slice: calcSlice[i.id] ?? ctx.slice })) : undefined;
    return out;
  }, [incidents, ctx, calcSlice]);
}
