/**
 * EPRE route intelligence — deterministic frontend simulation.
 *
 * Route geometries are SIMULATED road-like paths (grid-snapped curves), not real navigation.
 * Metrics are derived from the seeded traffic segments, intersections and the current simulated
 * time slice. Same inputs always produce the same output.
 */
import type {
  Intersection,
  LatLng,
  RouteId,
  RouteOption,
  RouteWeights,
  ScoredRoute,
  SignalRequest,
  TrafficSegment,
  TrafficSliceId,
} from '../types';
import { haversineKm, pathLengthKm, pointToPathKm } from './geo';
import { seeded } from './prng';

const STRATEGIES: Record<RouteId, { strategy: string; bend: number; speed: number }> = {
  A: { strategy: 'Fastest Estimated', bend: 0.04, speed: 44 },
  B: { strategy: 'Balanced', bend: 0.2, speed: 42 },
  C: { strategy: 'Alternative Corridor', bend: -0.3, speed: 40 },
};

const ROAD_RISK: Record<TrafficSegment['roadCondition'], number> = { Good: 0.1, Fair: 0.35, Poor: 0.6, Works: 0.8 };

export interface RouteInputs {
  key: string;
  origin: LatLng;
  destination: LatLng;
  segments: TrafficSegment[];
  intersections: Intersection[];
  slice: TrafficSliceId;
  signalRequests: SignalRequest[];
  incidentId: string;
}

/** Quadratic-bezier bend then grid-snap ("stair-step") so the path reads like a street network. */
function buildPath(o: LatLng, d: LatLng, bend: number, jitterKey: string): LatLng[] {
  const rand = seeded(jitterKey);
  const mid: LatLng = [(o[0] + d[0]) / 2, (o[1] + d[1]) / 2];
  const dx = d[1] - o[1];
  const dy = d[0] - o[0];
  const ctrl: LatLng = [mid[0] + dx * bend, mid[1] - dy * bend];
  const n = 7;
  const curve: LatLng[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const lat = (1 - t) ** 2 * o[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * d[0];
    const lng = (1 - t) ** 2 * o[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * d[1];
    const j = i === 0 || i === n ? 0 : (rand() - 0.5) * 0.0025;
    curve.push([lat + j, lng - j]);
  }
  const out: LatLng[] = [curve[0]];
  for (let i = 1; i < curve.length; i++) {
    const p = curve[i - 1];
    const q = curve[i];
    // alternate corner orientation to mimic block-by-block travel; corners are partially
    // chamfered so curved (longer) corridors also measure longer.
    const corner: LatLng = i % 2 === 0 ? [p[0], q[1]] : [q[0], p[1]];
    const m: LatLng = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    out.push([m[0] + (corner[0] - m[0]) * 0.6, m[1] + (corner[1] - m[1]) * 0.6]);
    out.push(q);
  }
  return out;
}

function nearPath(segPath: LatLng[], route: LatLng[], tolKm: number): boolean {
  return segPath.some((p) => pointToPathKm(p, route) < tolKm) || route.some((p, i) => i % 2 === 0 && pointToPathKm(p, segPath) < tolKm);
}

export function generateRoutes(inp: RouteInputs): RouteOption[] {
  const ids: RouteId[] = ['A', 'B', 'C'];
  return ids.map((id) => {
    const cfg = STRATEGIES[id];
    const path = buildPath(inp.origin, inp.destination, cfg.bend, `${inp.key}-${id}`);
    const rand = seeded(`${inp.key}-${id}-metrics`);
    const distanceKm = pathLengthKm(path);
    const missing: string[] = [];

    const hit = inp.segments.filter((s) => nearPath(s.path, path, 0.7));
    const congVals = hit.map((s) => s.congestion[inp.slice]).filter((v): v is number => v !== null);
    let congestion: number | null;
    if (hit.length === 0) {
      // local roads: seeded baseline, scaled by time slice
      const sliceFactor = { morning: 1, midday: 0.75, evening: 1.15, night: 0.4 }[inp.slice];
      congestion = Math.min(0.95, (0.28 + rand() * 0.18) * sliceFactor);
    } else if (congVals.length === 0) {
      congestion = null;
      missing.push('Congestion feed unavailable for this time slice');
    } else {
      congestion = congVals.reduce((a, b) => a + b, 0) / congVals.length;
      if (congVals.length < hit.length) missing.push('Partial congestion data on some segments');
    }

    const ints = inp.intersections.filter((x) => pointToPathKm(x.coords, path) < 0.5);
    const unmapped = Math.floor(distanceKm / 2.4);
    const signalCount = ints.length + unmapped;
    const cleared = inp.signalRequests.filter(
      (r) => r.incidentId === inp.incidentId && r.routeId === id && r.status === 'Simulated Request Approved' && ints.some((x) => x.id === r.intersectionId),
    ).length;
    const congForCalc = congestion ?? 0.6; // conservative assumption when missing
    const signalDelayMin = Math.max(0, signalCount - cleared) * 0.45 * (0.6 + congForCalc);

    let roadRisk: number | null;
    // Simulate a missing road-condition feed for some Route C instances (to demo explicit handling)
    if (id === 'C' && seeded(`${inp.key}-risk`)() < 0.34) {
      roadRisk = null;
      missing.push('Road-condition feed missing');
    } else if (hit.length > 0) {
      roadRisk = hit.reduce((a, s) => a + ROAD_RISK[s.roadCondition], 0) / hit.length;
    } else {
      roadRisk = 0.18 + rand() * 0.17;
    }

    const travelMin = (distanceKm / cfg.speed) * 60 * (1 + 1.3 * congForCalc) + signalDelayMin;
    const delayRange: [number, number] = [travelMin * 0.9, travelMin * (1.12 + congForCalc * 0.4)];
    const confidence = Math.max(0.3, 0.92 - missing.length * 0.22 - (hit.length === 0 ? 0.12 : 0));
    const via = hit.length ? hit.slice(0, 2).map((s) => s.corridor).filter((v, i, a) => a.indexOf(v) === i).join(' → ') : 'Local roads';

    return {
      id,
      strategy: cfg.strategy,
      via,
      path,
      geometry: 'simulated-road',
      distanceKm,
      travelMin,
      congestion,
      signalCount,
      signalsCleared: cleared,
      signalDelayMin,
      roadRisk,
      delayRange,
      confidence,
      segmentIds: hit.map((s) => s.id),
      intersectionIds: ints.map((x) => x.id),
      missing,
    };
  });
}

/**
 * Range normalisation: (x − min) / max(max − min, 25% of max). Best candidate → 0.
 * The 25% floor stops trivial differences from being exaggerated into large score gaps.
 * Missing values score 1 (worst), never 0.
 */
function norm(values: (number | null)[]): number[] {
  const known = values.filter((v): v is number => v !== null);
  if (!known.length) return values.map(() => 1);
  const min = Math.min(...known);
  const max = Math.max(...known);
  const denom = Math.max(max - min, 0.25 * Math.abs(max), 1e-9);
  return values.map((v) => (v === null ? 1 : Math.min(1, (v - min) / denom)));
}

export function scoreRoutes(routes: RouteOption[], w: RouteWeights): ScoredRoute[] {
  const total = w.time + w.congestion + w.signal + w.risk || 1;
  const t = norm(routes.map((r) => r.travelMin));
  const c = norm(routes.map((r) => r.congestion));
  const s = norm(routes.map((r) => r.signalDelayMin));
  const k = norm(routes.map((r) => r.roadRisk));
  const scored = routes.map((r, i) => {
    const components = {
      time: (t[i] * w.time) / total,
      congestion: (c[i] * w.congestion) / total,
      signal: (s[i] * w.signal) / total,
      risk: (k[i] * w.risk) / total,
    };
    return { ...r, components, score: components.time + components.congestion + components.signal + components.risk, rank: 0, tags: [] as string[] };
  });
  const order = [...scored].sort((a, b) => a.score - b.score || a.travelMin - b.travelMin);
  order.forEach((r, i) => (r.rank = i + 1));
  /** Unique minimum only — ties (within eps) earn no tag, so badges never overstate a difference. */
  const minBy = (f: (r: ScoredRoute) => number | null, eps: number) => {
    const vals = scored.filter((r) => f(r) !== null);
    if (vals.length < 2) return undefined;
    const best = vals.reduce((a, b) => ((f(a) as number) <= (f(b) as number) ? a : b));
    return vals.every((r) => r === best || (f(r) as number) - (f(best) as number) > eps) ? best : undefined;
  };
  minBy((r) => r.travelMin, 0.2)?.tags.push('Fastest ETA');
  minBy((r) => r.distanceKm, 0.05)?.tags.push('Shortest');
  minBy((r) => r.congestion, 0.02)?.tags.push('Least congested');
  return scored;
}

const p = (v: number) => `${Math.round(v * 100)}%`;
const m = (v: number) => `${v.toFixed(1)} min`;

/** Human-readable explanation of why the top-ranked route wins. */
export function explainRanking(scored: ScoredRoute[], segmentsById: Record<string, TrafficSegment>, slice: TrafficSliceId): { headline: string; reasons: string[]; tradeoffs: string[] } {
  const best = scored.find((r) => r.rank === 1);
  if (!best) return { headline: 'No route candidates available.', reasons: [], tradeoffs: [] };
  const others = scored.filter((r) => r.id !== best.id);
  const reasons: string[] = [];
  const tradeoffs: string[] = [];
  for (const o of others) {
    if (best.travelMin < o.travelMin - 0.2) reasons.push(`${m(o.travelMin - best.travelMin)} faster than Route ${o.id}.`);
    else if (best.travelMin > o.travelMin + 0.2) tradeoffs.push(`Route ${o.id} is ${m(best.travelMin - o.travelMin)} faster but scores worse overall (${o.score.toFixed(2)} vs ${best.score.toFixed(2)}).`);
    if (best.congestion !== null && o.congestion !== null && best.congestion < o.congestion - 0.05)
      reasons.push(`Lower congestion exposure than Route ${o.id} (${p(best.congestion)} vs ${p(o.congestion)}).`);
    if (o.congestion === null) reasons.push(`Route ${o.id} has missing congestion data and is scored conservatively.`);
    if (o.roadRisk === null) reasons.push(`Route ${o.id} lacks road-condition data and is scored conservatively.`);
  }
  const worstOther = others.flatMap((o) => o.segmentIds.filter((id) => !best.segmentIds.includes(id))).map((id) => segmentsById[id]).filter(Boolean);
  const heavy = worstOther.filter((s) => (s.congestion[slice] ?? 0) >= 0.75);
  if (heavy.length) reasons.push(`Avoids ${heavy[0].name} (simulated ${p(heavy[0].congestion[slice] ?? 0)} congestion).`);
  if (best.signalsCleared > 0) reasons.push(`${best.signalsCleared} signal(s) on this route have a simulated priority approval.`);
  const unique = Array.from(new Set(reasons)).slice(0, 4);
  const headline = `Route ${best.id} (${best.strategy}) is preferred in this simulation with the lowest weighted score (${best.score.toFixed(2)}).`;
  return { headline, reasons: unique.length ? unique : ['It offers the best balance of the weighted criteria among the candidates.'], tradeoffs };
}

export function straightLineKm(a: LatLng, b: LatLng) {
  return haversineKm(a, b);
}
