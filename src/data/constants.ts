import type { Capability, EmergencyType, IncidentStatus, Priority, AmbulanceStatus, RouteWeights, Settings, TrafficSliceId, LatLng } from '../types';

export const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
export const PRIORITY_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export const EMERGENCY_TYPES: EmergencyType[] = ['Cardiac', 'Stroke', 'Road Trauma', 'Fall Injury', 'Respiratory', 'Obstetric', 'Burns', 'Other Medical'];

export const INCIDENT_STATUSES: IncidentStatus[] = ['New', 'Awaiting Assignment', 'Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital', 'Completed', 'Cancelled'];

/** Linear workflow used by "Advance" actions. */
export const WORKFLOW: IncidentStatus[] = ['New', 'Awaiting Assignment', 'Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital', 'Completed'];

export const OPEN_STATUSES: IncidentStatus[] = ['New', 'Awaiting Assignment', 'Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital'];
export const UNASSIGNED_STATUSES: IncidentStatus[] = ['New', 'Awaiting Assignment'];

export const AMBULANCE_STATUSES: AmbulanceStatus[] = ['Available', 'Assigned', 'En Route to Pickup', 'At Pickup', 'Transporting Patient', 'At Hospital', 'Offline', 'Maintenance'];

export const CAPABILITIES: Capability[] = ['Trauma', 'Cardiac', 'Stroke', 'Burns', 'Obstetrics', 'Paediatrics', 'Neuro', 'General Emergency'];

/** Decision-support mapping only — not clinical triage. */
export const REQUIRED_CAPABILITY: Record<EmergencyType, Capability[]> = {
  Cardiac: ['Cardiac'],
  Stroke: ['Stroke', 'Neuro'],
  'Road Trauma': ['Trauma'],
  'Fall Injury': ['Trauma', 'General Emergency'],
  Respiratory: ['General Emergency'],
  Obstetric: ['Obstetrics'],
  Burns: ['Burns'],
  'Other Medical': ['General Emergency'],
};

export const DEFAULT_WEIGHTS: RouteWeights = { time: 0.5, congestion: 0.2, signal: 0.15, risk: 0.15 };

export const TRAFFIC_SLICES: { id: TrafficSliceId; label: string; window: string }[] = [
  { id: 'morning', label: 'Morning peak', window: '08:00–11:00' },
  { id: 'midday', label: 'Midday', window: '11:00–17:00' },
  { id: 'evening', label: 'Evening peak', window: '17:00–21:00' },
  { id: 'night', label: 'Night', window: '21:00–08:00' },
];

export const REGION_VIEWS: Record<Settings['defaultRegion'], { center: LatLng; zoom: number }> = {
  'All NCR': { center: [28.53, 77.19], zoom: 11 },
  'New Delhi': { center: [28.6, 77.21], zoom: 12 },
  Gurugram: { center: [28.46, 77.07], zoom: 12 },
  Faridabad: { center: [28.4, 77.31], zoom: 12 },
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  layers: { incidents: true, ambulances: true, hospitals: true, routes: true, traffic: false, signals: true },
  defaultRegion: 'All NCR',
  mapStyle: 'dark',
  weights: DEFAULT_WEIGHTS,
  units: 'km',
  density: 'comfortable',
  notify: { Incident: true, Assignment: true, Routing: true, Hospital: true, Signal: true, Status: true, System: true },
  toasts: true,
  simulationMode: 'manual',
  cursorGlow: true,
  cursorTrail: true,
};

export function congestionLevel(v: number | null): 'Free Flow' | 'Moderate' | 'Heavy' | 'Severe' | 'No data' {
  if (v === null) return 'No data';
  if (v < 0.35) return 'Free Flow';
  if (v < 0.6) return 'Moderate';
  if (v < 0.8) return 'Heavy';
  return 'Severe';
}
