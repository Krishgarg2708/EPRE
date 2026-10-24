/** Decision-support helpers. These rank options for an operator; they never make clinical decisions. */
import type { Ambulance, Hospital, Incident } from '../types';
import { REQUIRED_CAPABILITY } from '../data/constants';
import { straightLineEstimate } from './geo';

export interface HospitalSuggestion {
  hospital: Hospital;
  roadKm: number;
  minutes: number;
  capabilityMatch: boolean;
  eligible: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
}

const AVAIL_PENALTY: Record<Hospital['edStatus'], number> = { Available: 0, 'Limited Capacity': 0.3, Unknown: 0.55, Unavailable: 1 };

export function rankHospitals(incident: Incident, hospitals: Hospital[]): HospitalSuggestion[] {
  const needs = REQUIRED_CAPABILITY[incident.type];
  const rows = hospitals.map((h) => {
    const est = straightLineEstimate(incident.coords, h.coords);
    const capabilityMatch = needs.some((c) => h.capabilities.includes(c));
    const reasons: string[] = [];
    const warnings: string[] = [];
    if (capabilityMatch) reasons.push(`Lists ${needs.filter((c) => h.capabilities.includes(c)).join(' / ')} capability`);
    else warnings.push(`No listed ${needs.join(' / ')} capability`);
    if (h.edStatus === 'Available') reasons.push(`ED marked Available (${h.bedsAvailable ?? '—'} simulated beds)`);
    if (h.edStatus === 'Limited Capacity') warnings.push(`Limited capacity (${h.bedsAvailable ?? '—'} simulated beds)`);
    if (h.edStatus === 'Unknown') warnings.push('Capacity unknown — not treated as available');
    if (h.edStatus === 'Unavailable') warnings.push('ED marked Unavailable');
    return { hospital: h, roadKm: est.roadKm, minutes: est.minutes, capabilityMatch, eligible: h.edStatus !== 'Unavailable', score: 0, reasons, warnings };
  });
  const maxMin = Math.max(...rows.map((r) => r.minutes), 1);
  for (const r of rows) {
    r.score = (r.minutes / maxMin) * 0.45 + (r.capabilityMatch ? 0 : 0.35) + AVAIL_PENALTY[r.hospital.edStatus] * 0.35 + (r.eligible ? 0 : 5);
    r.reasons.push(`~${Math.round(r.minutes)} min estimated (straight-line × road factor)`);
  }
  return rows.sort((a, b) => a.score - b.score);
}

export interface AmbulanceSuggestion {
  ambulance: Ambulance;
  minutes: number;
  roadKm: number;
  available: boolean;
  reason: string;
}

export function rankAmbulances(incident: Incident, ambulances: Ambulance[]): AmbulanceSuggestion[] {
  const wantsALS = incident.priority === 'Critical' || incident.priority === 'High';
  return ambulances
    .map((a) => {
      const est = straightLineEstimate(a.coords, incident.coords);
      const available = a.status === 'Available';
      const penalty = wantsALS && a.type === 'BLS' ? 4 : 0;
      return {
        ambulance: a,
        minutes: est.minutes,
        roadKm: est.roadKm,
        available,
        reason: available
          ? `${a.type} unit, ~${Math.round(est.minutes)} min away${penalty ? ' (ALS preferred for this priority)' : ''}`
          : `Not available — ${a.status}`,
        sortKey: (available ? 0 : 1000) + est.minutes + penalty,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _s, ...rest }) => rest);
}
