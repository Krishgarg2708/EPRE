import L from 'leaflet';
import type { Ambulance, Hospital, Incident, SignalRequestStatus } from '../../types';

const C = {
  red: '#FF4D5A',
  amber: '#FFBF4A',
  green: '#36D399',
  blue: '#5C9DFF',
  cyan: '#35D5F2',
  mute: '#9AAABD',
};

const PRIORITY_COLOR: Record<Incident['priority'], string> = { Critical: C.red, High: C.amber, Medium: C.blue, Low: C.mute };
const AMB_COLOR: Record<Ambulance['status'], string> = {
  Available: C.green,
  Assigned: C.blue,
  'En Route to Pickup': C.cyan,
  'At Pickup': C.amber,
  'Transporting Patient': C.cyan,
  'At Hospital': C.blue,
  Offline: '#5b6878',
  Maintenance: C.amber,
};
const HSP_COLOR: Record<Hospital['edStatus'], string> = { Available: C.green, 'Limited Capacity': C.amber, Unavailable: C.red, Unknown: '#5b6878' };
export const SIGNAL_COLOR: Record<SignalRequestStatus, string> = {
  'Not Requested': '#5b6878',
  'Simulated Request Pending': C.amber,
  'Simulated Request Approved': C.green,
  'Simulated Request Rejected': C.red,
  'Simulated Request Expired': C.mute,
};

export const CONGESTION_COLOR = (v: number | null) => (v === null ? '#5b6878' : v < 0.35 ? C.green : v < 0.6 ? C.amber : v < 0.8 ? '#FF8A4A' : C.red);
export const COLORS = C;

const cache = new Map<string, L.DivIcon>();
function icon(key: string, make: () => L.DivIcon) {
  let i = cache.get(key);
  if (!i) {
    i = make();
    cache.set(key, i);
  }
  return i;
}

const AMB_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080D16" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v8M8 10h8"/><rect x="2" y="3" width="20" height="15" rx="2" stroke-width="0"/></svg>`;
const HSP_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#080D16" stroke-width="4" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>`;

export function incidentIcon(inc: Incident, selected: boolean) {
  const letter = inc.priority[0];
  return icon(`i-${inc.priority}-${selected}-${inc.status === 'Awaiting Assignment' || inc.status === 'New'}`, () =>
    L.divIcon({
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
      html: `<div class="epre-marker relative ${inc.priority === 'Critical' && (inc.status === 'New' || inc.status === 'Awaiting Assignment') ? 'mk-pulse' : ''}" style="width:26px;height:26px"><div class="epre-marker mk-incident ${selected ? 'mk-selected' : ''}" style="background:${PRIORITY_COLOR[inc.priority]}"><span>${letter}</span></div></div>`,
    }),
  );
}

export function ambulanceIcon(a: Ambulance, selected: boolean) {
  return icon(`a-${a.status}-${selected}`, () =>
    L.divIcon({
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
      html: `<div class="epre-marker mk-ambulance ${selected ? 'mk-selected' : ''}" style="background:${AMB_COLOR[a.status]}">${AMB_SVG}</div>`,
    }),
  );
}

export function hospitalIcon(h: Hospital, selected: boolean) {
  return icon(`h-${h.edStatus}-${selected}`, () =>
    L.divIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      html: `<div class="epre-marker mk-hospital ${selected ? 'mk-selected' : ''}" style="background:${HSP_COLOR[h.edStatus]}">${HSP_SVG}</div>`,
    }),
  );
}

export function signalIcon(status: SignalRequestStatus) {
  return icon(`s-${status}`, () =>
    L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: `<div class="epre-marker mk-signal" style="background:${SIGNAL_COLOR[status]}"></div>` }),
  );
}
