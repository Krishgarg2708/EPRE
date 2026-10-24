import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ActivityCategory,
  ActivityEvent,
  Ambulance,
  AmbulanceStatus,
  AppNotification,
  Availability,
  EntityRef,
  Hospital,
  Incident,
  IncidentStatus,
  RouteId,
  Settings,
  SignalRequest,
  TrafficSliceId,
} from '../types';
import {
  seedActivities,
  seedAmbulances,
  seedArchive,
  seedHospitals,
  seedIncidents,
  seedNotifications,
  seedSignalRequests,
  positionFor,
  ambulanceStatusFor,
  TRAFFIC_SEGMENTS,
  INTERSECTIONS,
} from '../data/seed';
import { DEFAULT_SETTINGS, WORKFLOW } from '../data/constants';
import { uid } from '../utils/cn';
import { straightLineEstimate } from '../utils/geo';
import { hashString } from '../utils/prng';
import { useToasts } from './toasts';

export interface NewIncidentInput {
  location: string;
  area: Incident['area'];
  coords: Incident['coords'];
  type: Incident['type'];
  priority: Incident['priority'];
  conditionSummary: string;
  contact?: string;
  notes?: string;
  requestedHospitalId?: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

interface DemoData {
  incidents: Incident[];
  archive: Incident[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  signalRequests: SignalRequest[];
  activities: ActivityEvent[];
  notifications: AppNotification[];
  trafficSlice: TrafficSliceId;
  /** Traffic slice used at each incident's last route calculation (stale detection). */
  calcSlice: Record<string, TrafficSliceId>;
}

interface UiState {
  selectedIncidentId: string | null;
  selectedAmbulanceId: string | null;
  createOpen: boolean;
}

export interface AppState extends DemoData, UiState {
  settings: Settings;
  seededAt: number;
  // selection / ui
  selectIncident: (id: string | null) => void;
  selectAmbulance: (id: string | null) => void;
  setCreateOpen: (v: boolean) => void;
  // incidents
  createIncident: (input: NewIncidentInput) => string;
  updateIncident: (id: string, patch: Partial<NewIncidentInput>) => void;
  setIncidentStatus: (id: string, status: IncidentStatus, note?: string) => ActionResult;
  advanceIncident: (id: string) => ActionResult;
  assignAmbulance: (incidentId: string, ambulanceId: string) => ActionResult;
  setHospital: (incidentId: string, hospitalId: string) => ActionResult;
  selectRoute: (incidentId: string, routeId: RouteId) => void;
  recordRecalculation: (incidentId: string, bestRoute: RouteId, changed: boolean) => void;
  // fleet
  setAmbulanceStatus: (id: string, status: AmbulanceStatus) => ActionResult;
  setAmbulanceNotes: (id: string, notes: string) => void;
  // hospitals
  setHospitalAvailability: (id: string, edStatus: Availability, beds: number | null) => void;
  // traffic & signals
  setTrafficSlice: (slice: TrafficSliceId) => void;
  requestSignal: (incidentId: string, routeId: RouteId, intersectionId: string) => ActionResult;
  resolveSignal: (id: string) => void;
  expireSignals: (incidentId: string) => void;
  // notifications
  markRead: (id: string, read?: boolean) => void;
  markAllRead: () => void;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  resetDemo: () => void;
}

function freshData(now: number): DemoData {
  const hospitals = seedHospitals(now);
  const incidents = seedIncidents(now);
  return {
    incidents,
    archive: seedArchive(now, hospitals),
    ambulances: seedAmbulances(now, incidents, hospitals),
    hospitals,
    signalRequests: seedSignalRequests(now),
    activities: seedActivities(now),
    notifications: seedNotifications(now),
    trafficSlice: 'evening',
    calcSlice: {},
  };
}

const CLOSED: IncidentStatus[] = ['Completed', 'Cancelled'];

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Writes an activity event, plus a notification and toast according to settings. */
      const log = (category: ActivityCategory, message: string, ref?: EntityRef, notif?: { title: string; body?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }) => {
        const now = new Date().toISOString();
        const { settings } = get();
        set((s) => ({
          activities: [{ id: uid('ACT'), at: now, category, message, ref }, ...s.activities].slice(0, 200),
          notifications:
            notif && settings.notify[category]
              ? [{ id: uid('NTF'), at: now, category, title: notif.title, body: notif.body ?? message, read: false, ref }, ...s.notifications].slice(0, 100)
              : s.notifications,
        }));
        if (notif && settings.toasts) useToasts.getState().push({ title: notif.title, body: notif.body ?? message, tone: notif.tone ?? 'info' });
      };

      const syncAmbulance = (inc: Incident) => {
        if (!inc.ambulanceId) return;
        const { hospitals } = get();
        set((s) => ({
          ambulances: s.ambulances.map((a) => {
            if (a.id !== inc.ambulanceId) return a;
            const hsp = hospitals.find((h) => h.id === inc.hospitalId);
            if (CLOSED.includes(inc.status)) {
              return { ...a, status: 'Available', incidentId: undefined, hospitalId: undefined, coords: inc.status === 'Completed' && hsp ? hsp.coords : a.coords, lastUpdate: new Date().toISOString() };
            }
            return { ...a, status: ambulanceStatusFor(inc), incidentId: inc.id, hospitalId: inc.hospitalId, coords: positionFor(a, inc, hsp), lastUpdate: new Date().toISOString() };
          }),
        }));
      };

      const patchIncident = (id: string, fn: (i: Incident) => Incident): Incident | undefined => {
        let updated: Incident | undefined;
        set((s) => ({
          incidents: s.incidents.map((i) => {
            if (i.id !== id) return i;
            updated = fn(i);
            return updated;
          }),
        }));
        return updated;
      };

      return {
        ...freshData(Date.now()),
        settings: DEFAULT_SETTINGS,
        seededAt: Date.now(),
        selectedIncidentId: 'INC-2406',
        selectedAmbulanceId: null,
        createOpen: false,

        selectIncident: (id) => set({ selectedIncidentId: id, selectedAmbulanceId: null }),
        selectAmbulance: (id) => set({ selectedAmbulanceId: id }),
        setCreateOpen: (v) => set({ createOpen: v }),

        createIncident: (input) => {
          const maxN = Math.max(2414, ...get().incidents.map((i) => Number(i.id.split('-')[1]) || 0));
          const unique = `INC-${maxN + 1}`;
          const now = new Date().toISOString();
          const inc: Incident = {
            id: unique,
            createdAt: now,
            ...input,
            hospitalId: input.requestedHospitalId,
            status: 'New',
            timeline: [{ at: now, status: 'New', note: 'Created by operator' }],
          };
          set((s) => ({ incidents: [inc, ...s.incidents], selectedIncidentId: unique }));
          log('Incident', `Incident ${unique} created — ${inc.type}, ${inc.location}`, { kind: 'incident', id: unique }, {
            title: `New incident ${unique}`,
            body: `${inc.type} · ${inc.priority} priority · ${inc.location}`,
            tone: inc.priority === 'Critical' ? 'danger' : 'info',
          });
          return unique;
        },

        updateIncident: (id, patch) => {
          patchIncident(id, (i) => ({ ...i, ...patch, hospitalId: patch.requestedHospitalId ?? i.hospitalId }));
          log('Incident', `Incident ${id} details edited`, { kind: 'incident', id });
        },

        setIncidentStatus: (id, status, note) => {
          const inc = get().incidents.find((i) => i.id === id);
          if (!inc) return { ok: false, error: 'Incident not found' };
          if (CLOSED.includes(inc.status)) return { ok: false, error: `Incident is already ${inc.status.toLowerCase()}` };
          const needsAmb: IncidentStatus[] = ['Assigned', 'Dispatched', 'En Route', 'At Pickup', 'Transporting', 'Arrived at Hospital', 'Completed'];
          if (needsAmb.includes(status) && !inc.ambulanceId) return { ok: false, error: 'Assign an ambulance before moving to this status' };
          const needsHsp: IncidentStatus[] = ['Transporting', 'Arrived at Hospital', 'Completed'];
          if (needsHsp.includes(status) && !inc.hospitalId) return { ok: false, error: 'Select a destination hospital before transporting' };
          const now = new Date().toISOString();
          const updated = patchIncident(id, (i) => {
            const next: Incident = { ...i, status, timeline: [...i.timeline, { at: now, status, note }] };
            if (status === 'At Pickup' && i.responseMin === undefined) {
              const amb = get().ambulances.find((a) => a.id === i.ambulanceId);
              const est = amb ? straightLineEstimate(amb.baseCoords, i.coords).minutes : 10;
              next.responseMin = Math.round(est * 0.85 * 10) / 10;
              next.routeUsed = i.selectedRouteId ?? 'A';
            }
            return next;
          });
          if (updated) syncAmbulance(updated);
          if (status === 'Cancelled' || status === 'Completed') get().expireSignals(id);
          log('Status', `${id} status changed to ${status}`, { kind: 'incident', id }, {
            title: `${id} → ${status}`,
            body: note ?? `${inc.type} · ${inc.location}`,
            tone: status === 'Cancelled' ? 'warning' : status === 'Completed' ? 'success' : 'info',
          });
          return { ok: true };
        },

        advanceIncident: (id) => {
          const inc = get().incidents.find((i) => i.id === id);
          if (!inc) return { ok: false, error: 'Incident not found' };
          const idx = WORKFLOW.indexOf(inc.status);
          if (idx < 0 || idx >= WORKFLOW.length - 1) return { ok: false, error: 'No further workflow step' };
          let next = WORKFLOW[idx + 1];
          if (next === 'Assigned' && !inc.ambulanceId) return { ok: false, error: 'Assign an ambulance to continue' };
          if (inc.status === 'New') next = 'Awaiting Assignment';
          return get().setIncidentStatus(id, next);
        },

        assignAmbulance: (incidentId, ambulanceId) => {
          const { incidents, ambulances } = get();
          const inc = incidents.find((i) => i.id === incidentId);
          const amb = ambulances.find((a) => a.id === ambulanceId);
          if (!inc || !amb) return { ok: false, error: 'Record not found' };
          if (CLOSED.includes(inc.status)) return { ok: false, error: 'Cannot assign to a closed incident' };
          if (amb.status !== 'Available') return { ok: false, error: `${amb.id} is ${amb.status} and cannot be assigned` };
          const prev = inc.ambulanceId;
          if (prev) {
            set((s) => ({ ambulances: s.ambulances.map((a) => (a.id === prev ? { ...a, status: 'Available', incidentId: undefined, hospitalId: undefined } : a)) }));
          }
          const now = new Date().toISOString();
          const keepStatus = !['New', 'Awaiting Assignment'].includes(inc.status);
          const updated = patchIncident(incidentId, (i) => ({
            ...i,
            ambulanceId,
            status: keepStatus ? i.status : 'Assigned',
            timeline: [...i.timeline, { at: now, status: keepStatus ? i.status : 'Assigned', note: `${ambulanceId} assigned${prev ? ` (replacing ${prev})` : ''}` }],
          }));
          if (updated) syncAmbulance(updated);
          log('Assignment', `${ambulanceId} (${amb.callSign}) assigned to ${incidentId}`, { kind: 'incident', id: incidentId }, {
            title: `${ambulanceId} assigned`,
            body: `${amb.callSign} → ${incidentId} · ${inc.location}`,
            tone: 'success',
          });
          return { ok: true };
        },

        setHospital: (incidentId, hospitalId) => {
          const hsp = get().hospitals.find((h) => h.id === hospitalId);
          const inc = get().incidents.find((i) => i.id === incidentId);
          if (!hsp || !inc) return { ok: false, error: 'Record not found' };
          if (hsp.edStatus === 'Unavailable') return { ok: false, error: `${hsp.name} is marked Unavailable` };
          const updated = patchIncident(incidentId, (i) => ({ ...i, hospitalId }));
          if (updated) syncAmbulance(updated);
          log('Hospital', `Destination for ${incidentId} set to ${hsp.name}; pre-alert prepared (simulated)`, { kind: 'incident', id: incidentId }, {
            title: 'Hospital pre-alert prepared (simulated)',
            body: `${hsp.name} · ${incidentId}`,
            tone: 'info',
          });
          return { ok: true };
        },

        selectRoute: (incidentId, routeId) => {
          patchIncident(incidentId, (i) => ({ ...i, selectedRouteId: routeId }));
          log('Routing', `Route ${routeId} selected for ${incidentId}`, { kind: 'incident', id: incidentId });
        },

        recordRecalculation: (incidentId, bestRoute, changed) => {
          set((s) => ({ calcSlice: { ...s.calcSlice, [incidentId]: s.trafficSlice } }));
          log('Routing', `Routes recalculated for ${incidentId} — Route ${bestRoute} ranks first${changed ? ' (changed)' : ''}`, { kind: 'incident', id: incidentId }, {
            title: 'Route recalculation complete',
            body: `${incidentId}: Route ${bestRoute} preferred${changed ? ' — recommendation changed' : ''}`,
            tone: changed ? 'warning' : 'info',
          });
        },

        setAmbulanceStatus: (id, status) => {
          const amb = get().ambulances.find((a) => a.id === id);
          if (!amb) return { ok: false, error: 'Ambulance not found' };
          if (amb.incidentId) return { ok: false, error: `${id} is on ${amb.incidentId}; change the incident status instead` };
          if (!['Available', 'Offline', 'Maintenance'].includes(status)) return { ok: false, error: 'Only Available, Offline or Maintenance can be set manually' };
          set((s) => ({ ambulances: s.ambulances.map((a) => (a.id === id ? { ...a, status, lastUpdate: new Date().toISOString() } : a)) }));
          log('Assignment', `${id} status set to ${status}`, { kind: 'ambulance', id }, { title: `${id} → ${status}`, tone: status === 'Available' ? 'success' : 'warning' });
          return { ok: true };
        },

        setAmbulanceNotes: (id, notes) => set((s) => ({ ambulances: s.ambulances.map((a) => (a.id === id ? { ...a, notes } : a)) })),

        setHospitalAvailability: (id, edStatus, beds) => {
          const h = get().hospitals.find((x) => x.id === id);
          set((s) => ({
            hospitals: s.hospitals.map((x) =>
              x.id === id ? { ...x, edStatus, bedsAvailable: edStatus === 'Unknown' ? null : beds, lastUpdate: new Date().toISOString() } : x,
            ),
          }));
          log('Hospital', `${h?.name ?? id} availability set to ${edStatus} (simulated)`, { kind: 'hospital', id }, {
            title: 'Hospital availability update (simulated)',
            body: `${h?.name ?? id}: ${edStatus}`,
            tone: edStatus === 'Available' ? 'success' : 'warning',
          });
        },

        setTrafficSlice: (slice) => {
          // Freeze existing recommendations to the previous snapshot so they show as stale until recalculated.
          set((s) => {
            const frozen = { ...s.calcSlice };
            for (const i of s.incidents) if (!frozen[i.id]) frozen[i.id] = s.trafficSlice;
            return { trafficSlice: slice, calcSlice: frozen };
          });
          log('Routing', `Simulated traffic snapshot changed to "${slice}" — recalculate routes to apply`, undefined);
        },

        requestSignal: (incidentId, routeId, intersectionId) => {
          const inc = get().incidents.find((i) => i.id === incidentId);
          if (!inc?.ambulanceId) return { ok: false, error: 'Incident needs an assigned ambulance' };
          if (CLOSED.includes(inc.status)) return { ok: false, error: 'Incident is closed' };
          const dup = get().signalRequests.find((r) => r.incidentId === incidentId && r.intersectionId === intersectionId && (r.status === 'Simulated Request Pending' || r.status === 'Simulated Request Approved'));
          if (dup) return { ok: false, error: 'An active simulated request already exists for this intersection' };
          const req: SignalRequest = {
            id: uid('SIG'),
            incidentId,
            ambulanceId: inc.ambulanceId,
            routeId,
            intersectionId,
            status: 'Simulated Request Pending',
            requestedAt: new Date().toISOString(),
          };
          set((s) => ({ signalRequests: [req, ...s.signalRequests] }));
          const name = INTERSECTIONS.find((x) => x.id === intersectionId)?.name ?? intersectionId;
          log('Signal', `Simulated priority request sent for ${name} (${inc.ambulanceId}, Route ${routeId})`, { kind: 'incident', id: incidentId });
          return { ok: true };
        },

        resolveSignal: (id) => {
          const req = get().signalRequests.find((r) => r.id === id);
          if (!req || req.status !== 'Simulated Request Pending') return;
          // Deterministic simulated outcome: depends on intersection + time slice only.
          const roll = hashString(`${req.intersectionId}-${get().trafficSlice}`) % 100;
          const approved = roll < 72;
          const status: SignalRequest['status'] = approved ? 'Simulated Request Approved' : 'Simulated Request Rejected';
          set((s) => ({
            signalRequests: s.signalRequests.map((r) =>
              r.id === id ? { ...r, status, resolvedAt: new Date().toISOString(), note: approved ? 'Simulated approval (demo rule).' : 'Simulated rejection: conflicting phase (demo rule).' } : r,
            ),
          }));
          const name = INTERSECTIONS.find((x) => x.id === req.intersectionId)?.name ?? req.intersectionId;
          log('Signal', `Simulated priority ${approved ? 'approved' : 'rejected'} at ${name}`, { kind: 'incident', id: req.incidentId }, {
            title: `Simulated priority ${approved ? 'approved' : 'rejected'}`,
            body: `${name} · ${req.ambulanceId}`,
            tone: approved ? 'success' : 'warning',
          });
        },

        expireSignals: (incidentId) =>
          set((s) => ({
            signalRequests: s.signalRequests.map((r) =>
              r.incidentId === incidentId && (r.status === 'Simulated Request Pending' || r.status === 'Simulated Request Approved')
                ? { ...r, status: 'Simulated Request Expired', resolvedAt: new Date().toISOString(), note: 'Expired: incident closed.' }
                : r,
            ),
          })),

        markRead: (id, read = true) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)) })),
        markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

        resetDemo: () => {
          const now = Date.now();
          set({ ...freshData(now), seededAt: now, selectedIncidentId: 'INC-2406', selectedAmbulanceId: null });
          useToasts.getState().push({ title: 'Demo data reset', body: 'Seeded demonstration dataset restored.', tone: 'success' });
        },
      };
    },
    {
      name: 'epre-demo-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Never persist the optional demo contact field.
      partialize: (s) => ({
        incidents: s.incidents.map(({ contact: _c, ...rest }) => rest),
        archive: s.archive,
        ambulances: s.ambulances,
        hospitals: s.hospitals,
        signalRequests: s.signalRequests,
        activities: s.activities,
        notifications: s.notifications,
        trafficSlice: s.trafficSlice,
        calcSlice: s.calcSlice,
        settings: s.settings,
        seededAt: s.seededAt,
        selectedIncidentId: s.selectedIncidentId,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        if (!p) return current;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}), weights: { ...DEFAULT_SETTINGS.weights, ...(p.settings?.weights ?? {}) } } };
      },
    },
  ),
);

export const TRAFFIC = TRAFFIC_SEGMENTS;
export const INTERSECTION_LIST = INTERSECTIONS;
export const SEGMENTS_BY_ID = Object.fromEntries(TRAFFIC_SEGMENTS.map((s) => [s.id, s]));
export const INTERSECTIONS_BY_ID = Object.fromEntries(INTERSECTIONS.map((s) => [s.id, s]));
