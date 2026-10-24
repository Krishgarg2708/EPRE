/**
 * Seeded demonstration dataset for Delhi NCR.
 * Every hospital, ambulance and incident here is FICTIONAL demo data placed at approximate
 * real-world coordinates. Hospital names are invented and carry the "(Demo)" suffix so they are
 * never mistaken for real facilities or real capacity.
 */
import type {
  ActivityEvent,
  Ambulance,
  AppNotification,
  Hospital,
  Incident,
  IncidentStatus,
  Intersection,
  LatLng,
  SignalRequest,
  TrafficSegment,
  EmergencyType,
  Priority,
  Region,
  RouteId,
} from '../types';
import { seeded, pick } from '../utils/prng';
import { pointAlong } from '../utils/geo';

const SOURCE = 'Simulated availability feed (demo)';

const iso = (now: number, minAgo: number) => new Date(now - minAgo * 60000).toISOString();

export function seedHospitals(now: number): Hospital[] {
  const h = (
    id: string,
    name: string,
    area: Region,
    address: string,
    coords: LatLng,
    edStatus: Hospital['edStatus'],
    bedsAvailable: number | null,
    bedsTotal: number,
    icuAvailable: number | null,
    capabilities: Hospital['capabilities'],
    updatedMinAgo: number,
  ): Hospital => ({
    id, name, area, address, coords, edStatus, bedsAvailable, bedsTotal, icuAvailable, capabilities,
    lastUpdate: iso(now, updatedMinAgo), source: SOURCE,
  });
  return [
    h('HSP-01', 'Central Delhi Medical Institute (Demo)', 'South Delhi', 'Demo address, Ansari Nagar, New Delhi', [28.5672, 77.21], 'Available', 14, 60, 3, ['Trauma', 'Cardiac', 'Stroke', 'Neuro', 'General Emergency'], 6),
    h('HSP-02', 'Connaught Circle General Hospital (Demo)', 'New Delhi', 'Demo address, Connaught Place, New Delhi', [28.6355, 77.2245], 'Limited Capacity', 3, 40, 0, ['Cardiac', 'General Emergency'], 11),
    h('HSP-03', 'Saket Cardiac & Stroke Centre (Demo)', 'South Delhi', 'Demo address, Saket, New Delhi', [28.5274, 77.2159], 'Available', 9, 35, 2, ['Cardiac', 'Stroke', 'Neuro', 'General Emergency'], 4),
    h('HSP-04', 'Dwarka Multispeciality Hospital (Demo)', 'West Delhi', 'Demo address, Sector 10, Dwarka', [28.5921, 77.046], 'Available', 11, 45, 2, ['Trauma', 'Obstetrics', 'Paediatrics', 'General Emergency'], 9),
    h('HSP-05', 'Rajouri Garden Emergency Hospital (Demo)', 'West Delhi', 'Demo address, Rajouri Garden, New Delhi', [28.6415, 77.1209], 'Limited Capacity', 2, 30, 1, ['General Emergency', 'Paediatrics'], 15),
    h('HSP-06', 'Gurugram Heart & Trauma Institute (Demo)', 'Gurugram', 'Demo address, Sector 38, Gurugram', [28.4395, 77.042], 'Available', 17, 70, 5, ['Trauma', 'Cardiac', 'Neuro', 'Stroke', 'General Emergency'], 3),
    h('HSP-07', 'Cyber City Medical Centre (Demo)', 'Gurugram', 'Demo address, DLF Cyber City, Gurugram', [28.495, 77.089], 'Unknown', null, 28, null, ['General Emergency', 'Cardiac'], 96),
    h('HSP-08', 'Faridabad District Emergency Hospital (Demo)', 'Faridabad', 'Demo address, Sector 16, Faridabad', [28.4089, 77.3178], 'Available', 8, 40, 1, ['Trauma', 'General Emergency', 'Obstetrics'], 7),
    h('HSP-09', "Faridabad Burns & Women's Hospital (Demo)", 'Faridabad', 'Demo address, Sector 21, Faridabad', [28.4305, 77.2995], 'Limited Capacity', 4, 25, 0, ['Burns', 'Obstetrics', 'General Emergency'], 12),
    h('HSP-10', 'Noida Neuro & Stroke Centre (Demo)', 'Noida', 'Demo address, Sector 62, Noida', [28.627, 77.365], 'Available', 6, 30, 2, ['Stroke', 'Neuro', 'General Emergency'], 5),
    h('HSP-11', 'Patparganj Community Hospital (Demo)', 'East Delhi', 'Demo address, Patparganj, Delhi', [28.623, 77.3], 'Unavailable', 0, 32, 0, ['General Emergency', 'Paediatrics'], 18),
    h('HSP-12', 'Okhla Trauma & Burns Unit (Demo)', 'South Delhi', 'Demo address, Okhla Phase II, New Delhi', [28.5355, 77.273], 'Available', 7, 26, 1, ['Trauma', 'Burns', 'General Emergency'], 8),
  ];
}

interface AmbSeed {
  id: string; callSign: string; type: Ambulance['type']; base: string; baseCoords: LatLng;
  status?: Ambulance['status']; fuel: number; notes: string;
}

const AMB_SEEDS: AmbSeed[] = [
  { id: 'AMB-101', callSign: 'Delta-1', type: 'ALS', base: 'Connaught Place Station', baseCoords: [28.6304, 77.2177], fuel: 82, notes: 'Cardiac monitor serviced last week (demo note).' },
  { id: 'AMB-102', callSign: 'Delta-2', type: 'BLS', base: 'Karol Bagh Station', baseCoords: [28.6519, 77.1909], fuel: 64, notes: '' },
  { id: 'AMB-103', callSign: 'Saket-1', type: 'ALS', base: 'Saket Station', baseCoords: [28.5245, 77.2066], fuel: 91, notes: '' },
  { id: 'AMB-104', callSign: 'Dwarka-1', type: 'BLS', base: 'Dwarka Sector 10 Station', baseCoords: [28.581, 77.059], fuel: 55, notes: '' },
  { id: 'AMB-105', callSign: 'Guru-1', type: 'ALS', base: 'Gurugram Sector 29 Station', baseCoords: [28.467, 77.065], fuel: 77, notes: '' },
  { id: 'AMB-106', callSign: 'Guru-2', type: 'BLS', base: 'Sohna Road Station', baseCoords: [28.42, 77.04], fuel: 88, notes: '' },
  { id: 'AMB-107', callSign: 'Fbd-1', type: 'ALS', base: 'Faridabad NIT Station', baseCoords: [28.39, 77.3], fuel: 69, notes: '' },
  { id: 'AMB-108', callSign: 'Lajpat-1', type: 'BLS', base: 'Lajpat Nagar Station', baseCoords: [28.5677, 77.2433], fuel: 47, notes: 'Refuel after current task (demo note).' },
  { id: 'AMB-109', callSign: 'Noida-1', type: 'ALS', base: 'Noida Sector 18 Station', baseCoords: [28.57, 77.326], status: 'Maintenance', fuel: 30, notes: 'Scheduled brake inspection (demo).' },
  { id: 'AMB-110', callSign: 'East-1', type: 'BLS', base: 'Laxmi Nagar Station', baseCoords: [28.6304, 77.2777], status: 'Offline', fuel: 0, notes: 'Telemetry offline in simulation.' },
  { id: 'AMB-111', callSign: 'VK-1', type: 'ALS', base: 'Vasant Kunj Station', baseCoords: [28.52, 77.158], fuel: 86, notes: '' },
  { id: 'AMB-112', callSign: 'Fbd-2', type: 'BLS', base: 'Faridabad Sector 15 Station', baseCoords: [28.396, 77.326], fuel: 73, notes: '' },
];

interface IncSeed {
  id: string; minAgo: number; location: string; area: Region; coords: LatLng; type: EmergencyType;
  priority: Priority; status: IncidentStatus; condition: string; amb?: string; hsp?: string; notes?: string; routeId?: RouteId;
}

const INC_SEEDS: IncSeed[] = [
  { id: 'INC-2401', minAgo: 14, location: 'Barakhamba Road, near Metro Gate 3', area: 'New Delhi', coords: [28.6285, 77.2275], type: 'Cardiac', priority: 'Critical', status: 'En Route', condition: 'Adult, chest pain reported by caller, conscious (demo).', amb: 'AMB-101', hsp: 'HSP-01' },
  { id: 'INC-2402', minAgo: 9, location: 'NH-48 service lane, Mahipalpur', area: 'South Delhi', coords: [28.546, 77.125], type: 'Road Trauma', priority: 'High', status: 'Assigned', condition: 'Two-wheeler collision, one injured adult (demo).', amb: 'AMB-111' },
  { id: 'INC-2403', minAgo: 4, location: 'Greater Kailash II, M Block Market', area: 'South Delhi', coords: [28.5305, 77.2435], type: 'Stroke', priority: 'Critical', status: 'Awaiting Assignment', condition: 'Sudden facial droop and slurred speech reported (demo).' },
  { id: 'INC-2404', minAgo: 31, location: 'Lajpat Nagar Central Market', area: 'South Delhi', coords: [28.57, 77.237], type: 'Fall Injury', priority: 'Medium', status: 'At Pickup', condition: 'Elderly person, fall from steps, suspected wrist injury (demo).', amb: 'AMB-108', hsp: 'HSP-12' },
  { id: 'INC-2405', minAgo: 42, location: 'Ajmal Khan Road, Karol Bagh', area: 'New Delhi', coords: [28.651, 77.19], type: 'Respiratory', priority: 'High', status: 'Transporting', condition: 'Breathing difficulty, known asthma history per caller (demo).', amb: 'AMB-102', hsp: 'HSP-05' },
  { id: 'INC-2406', minAgo: 6, location: 'Golf Course Road, Sector 54', area: 'Gurugram', coords: [28.4445, 77.1005], type: 'Road Trauma', priority: 'Critical', status: 'Dispatched', condition: 'Multi-vehicle collision, entrapment reported (demo).', amb: 'AMB-105', hsp: 'HSP-06' },
  { id: 'INC-2407', minAgo: 2, location: 'Sohna Road, near Subhash Chowk', area: 'Gurugram', coords: [28.415, 77.045], type: 'Obstetric', priority: 'Medium', status: 'New', condition: 'Pregnant adult, labour pains, stable (demo).' },
  { id: 'INC-2408', minAgo: 19, location: 'DLF Phase 3, U Block', area: 'Gurugram', coords: [28.4925, 77.0945], type: 'Other Medical', priority: 'Low', status: 'Awaiting Assignment', condition: 'Fever and weakness, ambulatory (demo).' },
  { id: 'INC-2409', minAgo: 11, location: 'Sector 21 market, Faridabad', area: 'Faridabad', coords: [28.425, 77.308], type: 'Burns', priority: 'High', status: 'Assigned', condition: 'Kitchen fire, partial-thickness burns to forearm (demo).', amb: 'AMB-107', hsp: 'HSP-09' },
  { id: 'INC-2410', minAgo: 7, location: 'Ballabgarh bus stand', area: 'Faridabad', coords: [28.341, 77.32], type: 'Cardiac', priority: 'Medium', status: 'New', condition: 'Palpitations, alert and talking (demo).' },
  { id: 'INC-2411', minAgo: 5, location: 'Mathura Road near Ashram Chowk', area: 'South Delhi', coords: [28.5715, 77.2575], type: 'Road Trauma', priority: 'High', status: 'Awaiting Assignment', condition: 'Pedestrian struck by car, conscious (demo).' },
  { id: 'INC-2412', minAgo: 58, location: 'Sector 12, Dwarka', area: 'West Delhi', coords: [28.592, 77.042], type: 'Fall Injury', priority: 'Low', status: 'Arrived at Hospital', condition: 'Ankle injury after fall, stable (demo).', amb: 'AMB-104', hsp: 'HSP-04' },
  { id: 'INC-2413', minAgo: 3, location: 'Mayur Vihar Phase 1', area: 'East Delhi', coords: [28.608, 77.292], type: 'Respiratory', priority: 'Medium', status: 'New', condition: 'Persistent cough with breathlessness (demo).' },
  { id: 'INC-2414', minAgo: 8, location: 'Sector 18 market, Noida', area: 'Noida', coords: [28.57, 77.321], type: 'Cardiac', priority: 'Critical', status: 'Awaiting Assignment', condition: 'Collapsed adult, bystander CPR reported (demo).' },
  { id: 'INC-2399', minAgo: 95, location: 'Hauz Khas Village entrance', area: 'South Delhi', coords: [28.5535, 77.194], type: 'Other Medical', priority: 'Low', status: 'Cancelled', condition: 'Caller reported patient left by private vehicle (demo).' },
  { id: 'INC-2398', minAgo: 120, location: 'Nehru Place bus terminal', area: 'South Delhi', coords: [28.549, 77.2515], type: 'Fall Injury', priority: 'Medium', status: 'Completed', condition: 'Minor head laceration (demo).', amb: 'AMB-103', hsp: 'HSP-03' },
];

const STATUS_ORDER: IncidentStatus[] = ['New', 'Awaiting Assignment', 'Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital', 'Completed'];

function buildTimeline(now: number, s: IncSeed): Incident['timeline'] {
  const target = s.status === 'Cancelled' ? 1 : STATUS_ORDER.indexOf(s.status);
  const steps = STATUS_ORDER.slice(0, target + 1);
  const span = s.minAgo;
  const tl: Incident['timeline'] = steps.map((st, i) => ({
    at: iso(now, span - (span * i) / Math.max(1, steps.length)),
    status: st,
  }));
  if (s.status === 'Cancelled') tl.push({ at: iso(now, span - 6), status: 'Cancelled', note: 'Cancelled by operator (demo).' });
  return tl;
}

export function seedIncidents(now: number): Incident[] {
  return INC_SEEDS.map((s) => {
    const rand = seeded(s.id);
    const reached = STATUS_ORDER.indexOf(s.status) >= STATUS_ORDER.indexOf('At Pickup') && s.status !== 'Cancelled';
    return {
      id: s.id,
      createdAt: iso(now, s.minAgo),
      location: s.location,
      area: s.area,
      coords: s.coords,
      type: s.type,
      priority: s.priority,
      status: s.status,
      conditionSummary: s.condition,
      notes: s.notes,
      ambulanceId: s.amb,
      hospitalId: s.hsp,
      selectedRouteId: s.routeId,
      responseMin: reached ? Math.round(7 + rand() * 9) : undefined,
      routeUsed: reached ? pick(rand, ['A', 'B', 'B', 'C'] as const) : undefined,
      timeline: buildTimeline(now, s),
    };
  });
}

/** Ambulance position is derived deterministically from its incident's workflow stage. */
export function positionFor(amb: Pick<Ambulance, 'baseCoords'>, inc: Incident | undefined, hsp: Hospital | undefined): LatLng {
  if (!inc) return amb.baseCoords;
  switch (inc.status) {
    case 'En Route':
      return pointAlong([amb.baseCoords, inc.coords], 0.5);
    case 'At Pickup':
      return inc.coords;
    case 'Transporting':
      return hsp ? pointAlong([inc.coords, hsp.coords], 0.5) : inc.coords;
    case 'Arrived at Hospital':
      return hsp ? hsp.coords : inc.coords;
    default:
      return amb.baseCoords;
  }
}

export function ambulanceStatusFor(inc: Incident): Ambulance['status'] {
  switch (inc.status) {
    case 'Assigned':
      return 'Assigned';
    case 'Dispatched':
    case 'En Route':
      return 'En Route to Pickup';
    case 'At Pickup':
      return 'At Pickup';
    case 'Transporting':
      return 'Transporting Patient';
    case 'Arrived at Hospital':
      return 'At Hospital';
    default:
      return 'Available';
  }
}

const ACTIVE_FOR_AMB: IncidentStatus[] = ['Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital'];

export function seedAmbulances(now: number, incidents: Incident[], hospitals: Hospital[]): Ambulance[] {
  return AMB_SEEDS.map((a, i) => {
    const inc = incidents.find((x) => x.ambulanceId === a.id && ACTIVE_FOR_AMB.includes(x.status));
    const hsp = hospitals.find((h) => h.id === inc?.hospitalId);
    return {
      id: a.id,
      callSign: a.callSign,
      type: a.type,
      base: a.base,
      baseCoords: a.baseCoords,
      coords: positionFor(a, inc, hsp),
      status: a.status ?? (inc ? ambulanceStatusFor(inc) : 'Available'),
      incidentId: inc?.id,
      hospitalId: inc?.hospitalId,
      fuelPct: a.fuel,
      crew: a.type === 'ALS' ? 3 : 2,
      lastUpdate: iso(now, (i % 4) + 1),
      maintenanceDue: new Date(now + (6 + i * 3) * 86400000).toISOString(),
      notes: a.notes,
    };
  });
}

export const TRAFFIC_SEGMENTS: TrafficSegment[] = [
  { id: 'SEG-01', name: 'Ring Road — AIIMS to Dhaula Kuan', corridor: 'Ring Road', path: [[28.568, 77.208], [28.572, 77.185], [28.59, 77.162]], congestion: { morning: 0.72, midday: 0.48, evening: 0.86, night: 0.18 }, roadCondition: 'Good', lengthKm: 5.4 },
  { id: 'SEG-02', name: 'NH-48 — Dhaula Kuan to Mahipalpur', corridor: 'NH-48', path: [[28.59, 77.162], [28.56, 77.14], [28.545, 77.123]], congestion: { morning: 0.64, midday: 0.42, evening: 0.78, night: 0.2 }, roadCondition: 'Good', lengthKm: 6.1 },
  { id: 'SEG-03', name: 'NH-48 — Mahipalpur to Shankar Chowk', corridor: 'NH-48', path: [[28.545, 77.123], [28.51, 77.1], [28.49, 77.08]], congestion: { morning: 0.58, midday: 0.4, evening: 0.81, night: 0.22 }, roadCondition: 'Fair', lengthKm: 7.2 },
  { id: 'SEG-04', name: 'Golf Course Road', corridor: 'Golf Course Road', path: [[28.48, 77.1], [28.46, 77.096], [28.44, 77.1]], congestion: { morning: 0.46, midday: 0.34, evening: 0.66, night: 0.14 }, roadCondition: 'Good', lengthKm: 4.6 },
  { id: 'SEG-05', name: 'MG Road — Gurugram', corridor: 'MG Road', path: [[28.48, 77.08], [28.479, 77.11], [28.481, 77.13]], congestion: { morning: 0.61, midday: 0.52, evening: 0.74, night: null }, roadCondition: 'Works', lengthKm: 5.0 },
  { id: 'SEG-06', name: 'Mathura Road — Ashram to Badarpur', corridor: 'Mathura Road', path: [[28.571, 77.258], [28.53, 77.285], [28.5, 77.3]], congestion: { morning: 0.83, midday: 0.62, evening: 0.92, night: 0.3 }, roadCondition: 'Poor', lengthKm: 8.6 },
  { id: 'SEG-07', name: 'Mathura Road — Badarpur to Faridabad', corridor: 'Mathura Road', path: [[28.5, 77.3], [28.45, 77.308], [28.4, 77.315]], congestion: { morning: 0.55, midday: 0.44, evening: 0.7, night: 0.21 }, roadCondition: 'Fair', lengthKm: 11.2 },
  { id: 'SEG-08', name: 'Outer Ring Road — Nehru Place to Saket', corridor: 'Outer Ring Road', path: [[28.549, 77.251], [28.53, 77.23], [28.525, 77.21]], congestion: { morning: 0.69, midday: 0.51, evening: 0.84, night: 0.19 }, roadCondition: 'Fair', lengthKm: 5.3 },
  { id: 'SEG-09', name: 'Barakhamba — Mandi House corridor', corridor: 'Central Delhi', path: [[28.63, 77.228], [28.626, 77.234], [28.62, 77.245]], congestion: { morning: 0.5, midday: 0.57, evening: 0.71, night: 0.16 }, roadCondition: 'Good', lengthKm: 2.1 },
  { id: 'SEG-10', name: 'Pusa Road — Karol Bagh', corridor: 'Pusa Road', path: [[28.644, 77.19], [28.642, 77.17], [28.641, 77.15]], congestion: { morning: 0.62, midday: 0.55, evening: 0.76, night: 0.2 }, roadCondition: 'Fair', lengthKm: 4.1 },
  { id: 'SEG-11', name: 'DND Flyway', corridor: 'DND', path: [[28.577, 77.26], [28.57, 77.29], [28.57, 77.315]], congestion: { morning: 0.38, midday: 0.26, evening: 0.52, night: 0.1 }, roadCondition: 'Good', lengthKm: 5.6 },
  { id: 'SEG-12', name: 'Dwarka Link Road', corridor: 'Dwarka Link', path: [[28.59, 77.162], [28.59, 77.11], [28.585, 77.06]], congestion: { morning: 0.44, midday: 0.3, evening: 0.6, night: 0.12 }, roadCondition: 'Good', lengthKm: 10.4 },
  { id: 'SEG-13', name: 'Lodhi Road', corridor: 'Lodhi Road', path: [[28.59, 77.22], [28.588, 77.24]], congestion: { morning: 0.33, midday: 0.28, evening: 0.47, night: 0.08 }, roadCondition: 'Good', lengthKm: 2.0 },
  { id: 'SEG-14', name: 'Aurobindo Marg — AIIMS to Adchini', corridor: 'Aurobindo Marg', path: [[28.6, 77.205], [28.57, 77.206], [28.54, 77.206]], congestion: { morning: 0.66, midday: null, evening: 0.79, night: 0.15 }, roadCondition: 'Fair', lengthKm: 6.7 },
];

export const INTERSECTIONS: Intersection[] = [
  { id: 'INT-01', name: 'AIIMS Flyover Junction', coords: [28.568, 77.208], segmentId: 'SEG-01' },
  { id: 'INT-02', name: 'Moti Bagh Crossing', coords: [28.574, 77.178], segmentId: 'SEG-01' },
  { id: 'INT-03', name: 'Dhaula Kuan Interchange', coords: [28.59, 77.162], segmentId: 'SEG-02' },
  { id: 'INT-04', name: 'Mahipalpur Junction', coords: [28.545, 77.123], segmentId: 'SEG-02' },
  { id: 'INT-05', name: 'Shankar Chowk', coords: [28.49, 77.08], segmentId: 'SEG-03' },
  { id: 'INT-06', name: 'Golf Course Rd / Sector 53', coords: [28.46, 77.096], segmentId: 'SEG-04' },
  { id: 'INT-07', name: 'MG Road / Sikanderpur', coords: [28.479, 77.096], segmentId: 'SEG-05' },
  { id: 'INT-08', name: 'Ashram Chowk', coords: [28.571, 77.258], segmentId: 'SEG-06' },
  { id: 'INT-09', name: 'Badarpur Border', coords: [28.5, 77.3], segmentId: 'SEG-07' },
  { id: 'INT-10', name: 'Nehru Place Flyover', coords: [28.549, 77.251], segmentId: 'SEG-08' },
  { id: 'INT-11', name: 'Press Enclave Junction', coords: [28.53, 77.23], segmentId: 'SEG-08' },
  { id: 'INT-12', name: 'Mandi House Circle', coords: [28.626, 77.234], segmentId: 'SEG-09' },
  { id: 'INT-13', name: 'Pusa Road Crossing', coords: [28.642, 77.17], segmentId: 'SEG-10' },
  { id: 'INT-14', name: 'Lodhi Road / Lala Lajpat Rai Marg', coords: [28.589, 77.23], segmentId: 'SEG-13' },
  { id: 'INT-15', name: 'Aurobindo Marg / Adchini', coords: [28.54, 77.206], segmentId: 'SEG-14' },
  { id: 'INT-16', name: 'Dwarka Sector 21 Junction', coords: [28.59, 77.11], segmentId: 'SEG-12' },
  { id: 'INT-17', name: 'Sector 15 Faridabad Crossing', coords: [28.45, 77.308], segmentId: 'SEG-07' },
];

export function seedSignalRequests(now: number): SignalRequest[] {
  return [
    { id: 'SIG-0101', incidentId: 'INC-2401', ambulanceId: 'AMB-101', routeId: 'B', intersectionId: 'INT-12', status: 'Simulated Request Approved', requestedAt: iso(now, 10), resolvedAt: iso(now, 10), note: 'Simulated approval (demo).' },
    { id: 'SIG-0102', incidentId: 'INC-2406', ambulanceId: 'AMB-105', routeId: 'A', intersectionId: 'INT-06', status: 'Simulated Request Pending', requestedAt: iso(now, 2) },
    { id: 'SIG-0103', incidentId: 'INC-2405', ambulanceId: 'AMB-102', routeId: 'B', intersectionId: 'INT-13', status: 'Simulated Request Rejected', requestedAt: iso(now, 30), resolvedAt: iso(now, 29), note: 'Simulated rejection: conflicting phase (demo).' },
    { id: 'SIG-0104', incidentId: 'INC-2398', ambulanceId: 'AMB-103', routeId: 'A', intersectionId: 'INT-10', status: 'Simulated Request Expired', requestedAt: iso(now, 110), resolvedAt: iso(now, 100), note: 'Window elapsed (demo).' },
    { id: 'SIG-0105', incidentId: 'INC-2404', ambulanceId: 'AMB-108', routeId: 'A', intersectionId: 'INT-08', status: 'Simulated Request Approved', requestedAt: iso(now, 24), resolvedAt: iso(now, 24) },
  ];
}

export function seedActivities(now: number): ActivityEvent[] {
  const a = (id: string, minAgo: number, category: ActivityEvent['category'], message: string, ref?: ActivityEvent['ref']): ActivityEvent => ({ id, at: iso(now, minAgo), category, message, ref });
  return [
    a('ACT-010', 2, 'Incident', 'Incident INC-2407 created — Obstetric, Sohna Road', { kind: 'incident', id: 'INC-2407' }),
    a('ACT-009', 2, 'Signal', 'Simulated priority request pending at Golf Course Rd / Sector 53', { kind: 'incident', id: 'INC-2406' }),
    a('ACT-008', 4, 'Incident', 'Incident INC-2403 created — Stroke, Greater Kailash II', { kind: 'incident', id: 'INC-2403' }),
    a('ACT-007', 5, 'Assignment', 'AMB-105 (Guru-1) dispatched to INC-2406', { kind: 'ambulance', id: 'AMB-105' }),
    a('ACT-006', 6, 'Hospital', 'Hospital pre-alert prepared for HSP-06 (simulated)', { kind: 'hospital', id: 'HSP-06' }),
    a('ACT-005', 9, 'Assignment', 'AMB-111 (VK-1) assigned to INC-2402', { kind: 'incident', id: 'INC-2402' }),
    a('ACT-004', 10, 'Signal', 'Simulated priority approved at Mandi House Circle for AMB-101', { kind: 'incident', id: 'INC-2401' }),
    a('ACT-003', 11, 'Routing', 'Route recommendation updated for INC-2401 — Route B preferred', { kind: 'incident', id: 'INC-2401' }),
    a('ACT-002', 15, 'Hospital', 'HSP-02 availability changed to Limited Capacity (simulated)', { kind: 'hospital', id: 'HSP-02' }),
    a('ACT-001', 31, 'Status', 'INC-2404 status changed to At Pickup', { kind: 'incident', id: 'INC-2404' }),
  ];
}

export function seedNotifications(now: number): AppNotification[] {
  const n = (id: string, minAgo: number, category: AppNotification['category'], title: string, body: string, read: boolean, ref?: AppNotification['ref']): AppNotification => ({ id, at: iso(now, minAgo), category, title, body, read, ref });
  return [
    n('NTF-07', 2, 'Incident', 'New incident INC-2407', 'Obstetric · Medium priority · Sohna Road', false, { kind: 'incident', id: 'INC-2407' }),
    n('NTF-06', 3, 'Incident', 'New incident INC-2413', 'Respiratory · Medium priority · Mayur Vihar', false, { kind: 'incident', id: 'INC-2413' }),
    n('NTF-05', 4, 'Incident', 'Critical incident INC-2403', 'Stroke · awaiting ambulance assignment', false, { kind: 'incident', id: 'INC-2403' }),
    n('NTF-04', 5, 'Assignment', 'AMB-105 dispatched', 'Assigned to INC-2406, Golf Course Road', true, { kind: 'ambulance', id: 'AMB-105' }),
    n('NTF-03', 10, 'Signal', 'Simulated priority approved', 'Mandi House Circle · AMB-101', true, { kind: 'incident', id: 'INC-2401' }),
    n('NTF-02', 15, 'Hospital', 'Availability update (simulated)', 'HSP-02 now Limited Capacity', false, { kind: 'hospital', id: 'HSP-02' }),
    n('NTF-01', 96, 'Hospital', 'Availability feed stale', 'HSP-07 has not reported for 96 min — status Unknown', true, { kind: 'hospital', id: 'HSP-07' }),
  ];
}

/** Historical archive: completed/cancelled demo records for the past 30 days, used by analytics. */
export function seedArchive(now: number, hospitals: Hospital[]): Incident[] {
  const rand = seeded('epre-archive-v1');
  const types: EmergencyType[] = ['Cardiac', 'Stroke', 'Road Trauma', 'Fall Injury', 'Respiratory', 'Obstetric', 'Burns', 'Other Medical'];
  const typeW = [0.18, 0.08, 0.2, 0.15, 0.14, 0.08, 0.04, 0.13];
  const pri: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
  const priW = [0.17, 0.31, 0.34, 0.18];
  const weighted = <T,>(items: T[], w: number[]) => {
    const r = rand();
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += w[i];
      if (r <= acc) return items[i];
    }
    return items[items.length - 1];
  };
  const areas: { area: Region; c: LatLng }[] = [
    { area: 'New Delhi', c: [28.625, 77.215] },
    { area: 'South Delhi', c: [28.545, 77.225] },
    { area: 'West Delhi', c: [28.62, 77.08] },
    { area: 'East Delhi', c: [28.62, 77.29] },
    { area: 'Gurugram', c: [28.46, 77.06] },
    { area: 'Faridabad', c: [28.4, 77.31] },
    { area: 'Noida', c: [28.58, 77.34] },
  ];
  const ambIds = AMB_SEEDS.map((a) => a.id);
  const out: Incident[] = [];
  for (let i = 0; i < 180; i++) {
    const dayAgo = Math.floor(rand() * 30);
    // more incidents in daytime/evening hours
    const hour = Math.floor(weighted([2, 7, 10, 13, 16, 19, 22], [0.06, 0.14, 0.18, 0.17, 0.16, 0.18, 0.11]) + rand() * 3) % 24;
    const t = new Date(now - dayAgo * 86400000);
    t.setHours(hour, Math.floor(rand() * 60), 0, 0);
    if (t.getTime() > now - 3 * 3600000) t.setTime(t.getTime() - 86400000);
    const ar = pick(rand, areas);
    const p = weighted(pri, priW);
    const ty = weighted(types, typeW);
    const cancelled = rand() < 0.06;
    const base = p === 'Critical' ? 8 : p === 'High' ? 10 : p === 'Medium' ? 13 : 16;
    // gentle downward drift in simulated response times across the period (demo only)
    const responseMin = Math.round((base + rand() * 7 + dayAgo * 0.06) * 10) / 10;
    const hospital = pick(rand, hospitals.filter((h) => h.area === ar.area || rand() < 0.15));
    const createdAt = t.toISOString();
    out.push({
      id: `INC-${(1800 + i).toString()}`,
      createdAt,
      location: `${ar.area} (archived demo record)`,
      area: ar.area,
      coords: [ar.c[0] + (rand() - 0.5) * 0.05, ar.c[1] + (rand() - 0.5) * 0.05],
      type: ty,
      priority: p,
      status: cancelled ? 'Cancelled' : 'Completed',
      conditionSummary: 'Archived demo record',
      ambulanceId: cancelled ? undefined : pick(rand, ambIds),
      hospitalId: cancelled ? undefined : hospital?.id,
      responseMin: cancelled ? undefined : responseMin,
      routeUsed: cancelled ? undefined : weighted(['A', 'B', 'C'] as RouteId[], [0.34, 0.48, 0.18]),
      timeline: [{ at: createdAt, status: 'New' }],
      archived: true,
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
