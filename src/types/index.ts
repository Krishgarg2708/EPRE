/** Shared domain types for EPRE. All records in this prototype are simulated demo data. */

export type LatLng = [number, number];

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export type EmergencyType =
  | 'Cardiac'
  | 'Stroke'
  | 'Road Trauma'
  | 'Fall Injury'
  | 'Respiratory'
  | 'Obstetric'
  | 'Burns'
  | 'Other Medical';

export type IncidentStatus =
  | 'New'
  | 'Awaiting Assignment'
  | 'Assigned'
  | 'Dispatched'
  | 'En Route'
  | 'At Pickup'
  | 'Transporting'
  | 'Arrived at Hospital'
  | 'Completed'
  | 'Cancelled';

export type RouteId = 'A' | 'B' | 'C';

export interface IncidentTimelineEntry {
  at: string;
  status: IncidentStatus;
  note?: string;
}

export interface Incident {
  id: string;
  createdAt: string;
  location: string;
  area: Region;
  coords: LatLng;
  type: EmergencyType;
  priority: Priority;
  status: IncidentStatus;
  conditionSummary: string;
  contact?: string;
  notes?: string;
  requestedHospitalId?: string;
  ambulanceId?: string;
  hospitalId?: string;
  selectedRouteId?: RouteId;
  /** Simulated response time in minutes (dispatch → at pickup). Set when reaching pickup. */
  responseMin?: number;
  /** Route that was used for the pickup leg (historical analytics). */
  routeUsed?: RouteId;
  timeline: IncidentTimelineEntry[];
  /** Archived historical demo records are excluded from live operations views. */
  archived?: boolean;
}

export type AmbulanceStatus =
  | 'Available'
  | 'Assigned'
  | 'En Route to Pickup'
  | 'At Pickup'
  | 'Transporting Patient'
  | 'At Hospital'
  | 'Offline'
  | 'Maintenance';

export type AmbulanceType = 'ALS' | 'BLS';

export interface Ambulance {
  id: string;
  callSign: string;
  type: AmbulanceType;
  base: string;
  baseCoords: LatLng;
  coords: LatLng;
  status: AmbulanceStatus;
  incidentId?: string;
  hospitalId?: string;
  fuelPct: number;
  crew: number;
  lastUpdate: string;
  maintenanceDue: string;
  notes: string;
}

export type Availability = 'Available' | 'Limited Capacity' | 'Unavailable' | 'Unknown';

export type Capability =
  | 'Trauma'
  | 'Cardiac'
  | 'Stroke'
  | 'Burns'
  | 'Obstetrics'
  | 'Paediatrics'
  | 'Neuro'
  | 'General Emergency';

export type Region = 'New Delhi' | 'South Delhi' | 'West Delhi' | 'East Delhi' | 'Gurugram' | 'Faridabad' | 'Noida';

export interface Hospital {
  id: string;
  name: string;
  area: Region;
  address: string;
  coords: LatLng;
  edStatus: Availability;
  bedsAvailable: number | null;
  bedsTotal: number;
  icuAvailable: number | null;
  capabilities: Capability[];
  lastUpdate: string;
  source: string;
}

export type CongestionLevel = 'Free Flow' | 'Moderate' | 'Heavy' | 'Severe';

export type TrafficSliceId = 'morning' | 'midday' | 'evening' | 'night';

export interface TrafficSegment {
  id: string;
  name: string;
  corridor: string;
  path: LatLng[];
  /** Congestion index 0..1 per simulated time slice. null = no data for that slice. */
  congestion: Record<TrafficSliceId, number | null>;
  roadCondition: 'Good' | 'Fair' | 'Poor' | 'Works';
  lengthKm: number;
}

export interface Intersection {
  id: string;
  name: string;
  coords: LatLng;
  segmentId: string;
}

export type SignalRequestStatus =
  | 'Not Requested'
  | 'Simulated Request Pending'
  | 'Simulated Request Approved'
  | 'Simulated Request Rejected'
  | 'Simulated Request Expired';

export interface SignalRequest {
  id: string;
  incidentId: string;
  ambulanceId: string;
  routeId: RouteId;
  intersectionId: string;
  status: SignalRequestStatus;
  requestedAt: string;
  resolvedAt?: string;
  note?: string;
}

export interface RouteOption {
  id: RouteId;
  strategy: string;
  via: string;
  path: LatLng[];
  geometry: 'simulated-road' | 'straight-line';
  distanceKm: number;
  travelMin: number;
  congestion: number | null;
  signalCount: number;
  signalsCleared: number;
  signalDelayMin: number;
  roadRisk: number | null;
  delayRange: [number, number];
  confidence: number;
  segmentIds: string[];
  intersectionIds: string[];
  missing: string[];
}

export interface ScoredRoute extends RouteOption {
  score: number;
  rank: number;
  components: { time: number; congestion: number; signal: number; risk: number };
  tags: string[];
}

export interface RouteWeights {
  time: number;
  congestion: number;
  signal: number;
  risk: number;
}

export type ActivityCategory = 'Incident' | 'Assignment' | 'Routing' | 'Hospital' | 'Signal' | 'Status' | 'System';

export interface ActivityEvent {
  id: string;
  at: string;
  category: ActivityCategory;
  message: string;
  ref?: EntityRef;
}

export interface EntityRef {
  kind: 'incident' | 'ambulance' | 'hospital' | 'signal';
  id: string;
}

export interface AppNotification {
  id: string;
  at: string;
  category: ActivityCategory;
  title: string;
  body: string;
  read: boolean;
  ref?: EntityRef;
}

export type LayerKey = 'incidents' | 'ambulances' | 'hospitals' | 'routes' | 'traffic' | 'signals';

export interface Settings {
  theme: 'dark' | 'light';
  layers: Record<LayerKey, boolean>;
  defaultRegion: 'All NCR' | 'New Delhi' | 'Gurugram' | 'Faridabad';
  mapStyle: 'dark' | 'standard';
  weights: RouteWeights;
  units: 'km' | 'mi';
  density: 'comfortable' | 'compact';
  notify: Record<ActivityCategory, boolean>;
  toasts: boolean;
  simulationMode: 'manual' | 'auto';
  cursorGlow: boolean;
  cursorTrail: boolean;
}
