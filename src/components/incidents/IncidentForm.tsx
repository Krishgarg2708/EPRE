import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Incident, Region } from '../../types';
import { EMERGENCY_TYPES, PRIORITIES } from '../../data/constants';
import { Field, Input, Select, Textarea } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Disclaimer } from '../ui/Sim';
import { useApp, type NewIncidentInput } from '../../context/store';
import { toast } from '../../context/toasts';

const REGIONS: Region[] = ['New Delhi', 'South Delhi', 'West Delhi', 'East Delhi', 'Gurugram', 'Faridabad', 'Noida'];

export const DEMO_LOCATIONS: { label: string; area: Region; coords: [number, number] }[] = [
  { label: 'India Gate lawns', area: 'New Delhi', coords: [28.6129, 77.2295] },
  { label: 'Chandni Chowk main road', area: 'New Delhi', coords: [28.6506, 77.2303] },
  { label: 'Hauz Khas metro', area: 'South Delhi', coords: [28.5434, 77.2066] },
  { label: 'Kalkaji Mandir', area: 'South Delhi', coords: [28.5502, 77.2588] },
  { label: 'Janakpuri District Centre', area: 'West Delhi', coords: [28.6292, 77.0806] },
  { label: 'Preet Vihar', area: 'East Delhi', coords: [28.6415, 77.2955] },
  { label: 'Cyber Hub, Gurugram', area: 'Gurugram', coords: [28.4952, 77.0889] },
  { label: 'Huda City Centre', area: 'Gurugram', coords: [28.4595, 77.0727] },
  { label: 'Sector 12, Faridabad', area: 'Faridabad', coords: [28.3978, 77.3144] },
  { label: 'Noida Sector 62', area: 'Noida', coords: [28.6208, 77.3633] },
];

interface FormState {
  location: string;
  area: Region;
  lat: string;
  lng: string;
  type: Incident['type'];
  priority: Incident['priority'];
  conditionSummary: string;
  contact: string;
  notes: string;
  requestedHospitalId: string;
}

const empty: FormState = { location: '', area: 'New Delhi', lat: '', lng: '', type: 'Cardiac', priority: 'High', conditionSummary: '', contact: '', notes: '', requestedHospitalId: '' };

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (f.location.trim().length < 4) e.location = 'Enter a pickup location (at least 4 characters).';
  const lat = Number(f.lat), lng = Number(f.lng);
  if (f.lat === '' || Number.isNaN(lat)) e.lat = 'Latitude is required.';
  else if (lat < 28.2 || lat > 28.95) e.lat = 'Must be within the Delhi NCR demo region (28.20–28.95).';
  if (f.lng === '' || Number.isNaN(lng)) e.lng = 'Longitude is required.';
  else if (lng < 76.8 || lng > 77.6) e.lng = 'Must be within the Delhi NCR demo region (76.80–77.60).';
  if (f.conditionSummary.trim().length < 8) e.conditionSummary = 'Add a short, non-identifying condition summary (8+ characters).';
  if (f.contact && !/^[+\d][\d\s-]{6,15}$/.test(f.contact.trim())) e.contact = 'Use digits only (demo value, not stored).';
  return e;
}

export function IncidentFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Incident }) {
  const hospitals = useApp((s) => s.hospitals);
  const createIncident = useApp((s) => s.createIncident);
  const updateIncident = useApp((s) => s.updateIncident);
  const [f, setF] = useState<FormState>(empty);
  const [touched, setTouched] = useState(false);
  const errors = validate(f);
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setF(
      editing
        ? { location: editing.location, area: editing.area, lat: String(editing.coords[0]), lng: String(editing.coords[1]), type: editing.type, priority: editing.priority, conditionSummary: editing.conditionSummary, contact: editing.contact ?? '', notes: editing.notes ?? '', requestedHospitalId: editing.requestedHospitalId ?? '' }
        : empty,
    );
  }, [open, editing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const err = (k: keyof FormState) => (touched ? errors[k] : undefined);

  const submit = () => {
    setTouched(true);
    if (hasErrors) return;
    const input: NewIncidentInput = {
      location: f.location.trim(),
      area: f.area,
      coords: [Number(f.lat), Number(f.lng)],
      type: f.type,
      priority: f.priority,
      conditionSummary: f.conditionSummary.trim(),
      contact: f.contact.trim() || undefined,
      notes: f.notes.trim() || undefined,
      requestedHospitalId: f.requestedHospitalId || undefined,
    };
    if (editing) {
      updateIncident(editing.id, input);
      toast('Incident updated', editing.id, 'success');
    } else {
      createIncident(input);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit incident ${editing.id}` : 'Create emergency incident'}
      description="Demo simulation — this does not contact any real emergency service."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={editing ? 'primary' : 'danger'} onClick={submit}>{editing ? 'Save changes' : 'Create incident'}</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="sm:col-span-2">
          <Field label="Quick-fill demo location" hint="Optional: fills location, area and coordinates with a demo point.">
            <Select
              value=""
              onChange={(e) => {
                const l = DEMO_LOCATIONS[Number(e.target.value)];
                if (l) setF((p) => ({ ...p, location: l.label, area: l.area, lat: String(l.coords[0]), lng: String(l.coords[1]) }));
              }}
              aria-label="Quick-fill demo location"
            >
              <option value="">Choose a demo location…</option>
              {DEMO_LOCATIONS.map((l, i) => <option key={l.label} value={i}>{l.label} — {l.area}</option>)}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Incident location" required error={err('location')} htmlFor="f-loc">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" aria-hidden />
              <Input id="f-loc" className="pl-9" value={f.location} onChange={(e) => set('location', e.target.value)} invalid={!!err('location')} placeholder="e.g. Hauz Khas metro, Gate 2" data-autofocus />
            </div>
          </Field>
        </div>
        <Field label="Area" htmlFor="f-area"><Select id="f-area" value={f.area} onChange={(e) => set('area', e.target.value as Region)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" required error={err('lat')} htmlFor="f-lat"><Input id="f-lat" inputMode="decimal" value={f.lat} onChange={(e) => set('lat', e.target.value)} invalid={!!err('lat')} placeholder="28.6129" /></Field>
          <Field label="Longitude" required error={err('lng')} htmlFor="f-lng"><Input id="f-lng" inputMode="decimal" value={f.lng} onChange={(e) => set('lng', e.target.value)} invalid={!!err('lng')} placeholder="77.2295" /></Field>
        </div>
        <Field label="Emergency type" htmlFor="f-type"><Select id="f-type" value={f.type} onChange={(e) => set('type', e.target.value as Incident['type'])}>{EMERGENCY_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Priority" htmlFor="f-pri" hint="Operator-assigned. EPRE does not perform clinical triage."><Select id="f-pri" value={f.priority} onChange={(e) => set('priority', e.target.value as Incident['priority'])}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        <div className="sm:col-span-2">
          <Field label="Patient condition summary" required error={err('conditionSummary')} hint="Use non-identifying demo text only — no names or personal details." htmlFor="f-cond">
            <Textarea id="f-cond" value={f.conditionSummary} onChange={(e) => set('conditionSummary', e.target.value)} invalid={!!err('conditionSummary')} placeholder="e.g. Adult, breathing difficulty, conscious" />
          </Field>
        </div>
        <Field label="Contact (demo only, optional)" error={err('contact')} hint="Demo-only. Never saved to browser storage." htmlFor="f-contact"><Input id="f-contact" value={f.contact} onChange={(e) => set('contact', e.target.value)} invalid={!!err('contact')} placeholder="+91 00000 00000" /></Field>
        <Field label="Requested destination (optional)" htmlFor="f-dest">
          <Select id="f-dest" value={f.requestedHospitalId} onChange={(e) => set('requestedHospitalId', e.target.value)}>
            <option value="">No preference</option>
            {hospitals.map((h) => <option key={h.id} value={h.id} disabled={h.edStatus === 'Unavailable'}>{h.name}{h.edStatus === 'Unavailable' ? ' (Unavailable)' : ''}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2"><Field label="Notes" htmlFor="f-notes"><Textarea id="f-notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Access instructions, landmarks…" /></Field></div>
        <div className="sm:col-span-2"><Disclaimer>Prototype form. Creating an incident only updates this browser's simulated dataset.</Disclaimer></div>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
