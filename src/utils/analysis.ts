import type { Ambulance, Hospital, Incident, LatLng, RouteWeights, ScoredRoute, SignalRequest, TrafficSliceId } from '../types';
import { TRAFFIC_SEGMENTS, INTERSECTIONS } from '../data/seed';
import { explainRanking, generateRoutes, scoreRoutes } from './routing';

export interface RouteAnalysis {
  origin: LatLng;
  destination: LatLng;
  originLabel: string;
  routes: ScoredRoute[];
  best: ScoredRoute;
  selected: ScoredRoute;
  explanation: ReturnType<typeof explainRanking>;
  leg: 'pickup' | 'hospital';
  previewAmbulanceId?: string;
}

export interface AnalysisContext {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  slice: TrafficSliceId;
  weights: RouteWeights;
  signals: SignalRequest[];
}

const SEG_BY_ID = Object.fromEntries(TRAFFIC_SEGMENTS.map((s) => [s.id, s]));

export function analyzeIncident(incident: Incident, ctx: AnalysisContext): RouteAnalysis | null {
  const amb = ctx.ambulances.find((a) => a.id === incident.ambulanceId);
  const hsp = ctx.hospitals.find((h) => h.id === incident.hospitalId);
  const hospitalLeg = ['At Pickup', 'Transporting', 'Arrived at Hospital'].includes(incident.status) && !!hsp;
  let origin: LatLng;
  let destination: LatLng;
  let originLabel: string;
  let previewAmbulanceId: string | undefined;
  if (hospitalLeg && hsp) {
    origin = incident.coords;
    destination = hsp.coords;
    originLabel = `Pickup → ${hsp.name}`;
  } else if (amb) {
    origin = amb.baseCoords;
    destination = incident.coords;
    originLabel = `${amb.id} (${amb.base}) → pickup`;
  } else {
    const d = (c: LatLng) => Math.hypot(c[0] - incident.coords[0], c[1] - incident.coords[1]);
    const nearest = ctx.ambulances.filter((a) => a.status === 'Available').sort((a, b) => d(a.coords) - d(b.coords))[0];
    if (!nearest) return null;
    origin = nearest.coords;
    destination = incident.coords;
    previewAmbulanceId = nearest.id;
    originLabel = `Preview from nearest available unit ${nearest.id}`;
  }
  const raw = generateRoutes({
    key: `${incident.id}-${hospitalLeg ? 'H' : 'P'}`,
    origin,
    destination,
    segments: TRAFFIC_SEGMENTS,
    intersections: INTERSECTIONS,
    slice: ctx.slice,
    signalRequests: ctx.signals,
    incidentId: incident.id,
  });
  const routes = scoreRoutes(raw, ctx.weights);
  const best = routes.find((r) => r.rank === 1) ?? routes[0];
  const selected = routes.find((r) => r.id === incident.selectedRouteId) ?? best;
  return { origin, destination, originLabel, routes, best, selected, explanation: explainRanking(routes, SEG_BY_ID, ctx.slice), leg: hospitalLeg ? 'hospital' : 'pickup', previewAmbulanceId };
}

/** Remaining simulated ETA (minutes) for the current leg, based on workflow stage. */
export function remainingEta(incident: Incident, a: RouteAnalysis | null): number | undefined {
  if (!a || !incident.ambulanceId) return undefined;
  const t = a.selected.travelMin;
  switch (incident.status) {
    case 'Assigned':
    case 'Dispatched':
      return t;
    case 'En Route':
      return t * 0.5;
    case 'At Pickup':
      return a.leg === 'hospital' ? t : undefined;
    case 'Transporting':
      return t * 0.5;
    default:
      return undefined;
  }
}
