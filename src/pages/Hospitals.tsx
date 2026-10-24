import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, GitCompare, CheckCircle2, AlertTriangle, Hospital as HIcon, Inbox, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, KV, EmptyState } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Drawer, Modal } from '../components/ui/Modal';
import { Select, Field, Input } from '../components/ui/Form';
import { AvailabilityBadge, Badge, PriorityBadge } from '../components/ui/Badges';
import { SimTag, Disclaimer } from '../components/ui/Sim';
import { useApp } from '../context/store';
import { toast } from '../context/toasts';
import { useOpenIncidents } from '../hooks/useEntities';
import { CAPABILITIES } from '../data/constants';
import { rankHospitals, type HospitalSuggestion } from '../utils/recommend';
import { straightLineEstimate } from '../utils/geo';
import { fmtCoords, fmtDateTime, fmtDistance, timeAgo } from '../utils/format';
import type { Availability, Hospital } from '../types';
import { cn } from '../utils/cn';

const STATUSES: Availability[] = ['Available', 'Limited Capacity', 'Unavailable', 'Unknown'];

function HospitalDrawer({ h, onClose, refIncidentId }: { h: Hospital | undefined; onClose: () => void; refIncidentId: string }) {
  const update = useApp((s) => s.setHospitalAvailability);
  const setHospital = useApp((s) => s.setHospital);
  const incidents = useApp((s) => s.incidents);
  const units = useApp((s) => s.settings.units);
  const [st, setSt] = useState<Availability>('Available');
  const [beds, setBeds] = useState('');
  useEffect(() => { if (h) { setSt(h.edStatus); setBeds(h.bedsAvailable === null ? '' : String(h.bedsAvailable)); } }, [h?.id, h?.edStatus, h?.bedsAvailable]);
  if (!h) return null;
  const inc = incidents.find((i) => i.id === refIncidentId);
  const est = inc ? straightLineEstimate(inc.coords, h.coords) : null;
  const bedsN = beds === '' ? null : Number(beds);
  const bedsErr = st !== 'Unknown' && (bedsN === null || Number.isNaN(bedsN) || bedsN < 0 || bedsN > h.bedsTotal) ? `Enter 0–${h.bedsTotal}` : undefined;
  return (
    <Drawer open onClose={onClose} title={h.name} subtitle={<span className="flex items-center gap-2"><AvailabilityBadge s={h.edStatus} /><SimTag /></span>}>
      <div className="space-y-5">
        <section>
          <KV k="Demonstration address" v={h.address} />
          <KV k="Area" v={h.area} />
          <KV k="Coordinates" v={fmtCoords(h.coords)} mono />
          <KV k="ED status" v={<AvailabilityBadge s={h.edStatus} />} />
          <KV k="Beds available (simulated)" v={`${h.bedsAvailable ?? 'Unknown'} / ${h.bedsTotal}`} />
          <KV k="ICU available (simulated)" v={h.icuAvailable ?? 'Unknown'} />
          <KV k="Last availability update" v={`${timeAgo(h.lastUpdate)} · ${fmtDateTime(h.lastUpdate)}`} />
          <KV k="Data source" v={h.source} />
          {inc && est && <KV k={`From ${inc.id}`} v={`${fmtDistance(est.roadKm, units)} · ~${Math.round(est.minutes)} min (straight-line × road factor)`} />}
        </section>
        <section>
          <div className="label mb-2">Capabilities</div>
          <div className="flex flex-wrap gap-1">{h.capabilities.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}</div>
        </section>
        {inc && (
          <Button variant="primary" disabled={h.edStatus === 'Unavailable' || inc.hospitalId === h.id} onClick={() => { const r = setHospital(inc.id, h.id); if (!r.ok) toast('Cannot select', r.error, 'danger'); }}>
            {inc.hospitalId === h.id ? `Destination for ${inc.id}` : `Set as destination for ${inc.id}`}
          </Button>
        )}
        <section className="rounded-md border border-line p-3 space-y-3">
          <div className="flex items-center justify-between"><div className="label">Simulate availability update</div><SimTag>DEMO</SimTag></div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ED status" htmlFor="h-st"><Select id="h-st" value={st} onChange={(e) => setSt(e.target.value as Availability)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Beds available" error={bedsErr} htmlFor="h-beds"><Input id="h-beds" type="number" min={0} max={h.bedsTotal} value={st === 'Unknown' ? '' : beds} disabled={st === 'Unknown'} onChange={(e) => setBeds(e.target.value)} invalid={!!bedsErr} /></Field>
          </div>
          <Button size="xs" disabled={!!bedsErr} onClick={() => update(h.id, st, st === 'Unknown' ? null : bedsN)}>Apply simulated update</Button>
          <p className="text-[11px] text-mute">Simulates a feed update. Unknown capacity is never treated as available.</p>
        </section>
      </div>
    </Drawer>
  );
}

function CompareModal({ open, onClose, rows }: { open: boolean; onClose: () => void; rows: (HospitalSuggestion | { hospital: Hospital; minutes?: number; roadKm?: number; capabilityMatch?: boolean })[] }) {
  const units = useApp((s) => s.settings.units);
  const attrs: { label: string; get: (r: (typeof rows)[number]) => ReactNode }[] = [
    { label: 'ED status', get: (r) => <AvailabilityBadge s={r.hospital.edStatus} /> },
    { label: 'Beds (sim.)', get: (r) => `${r.hospital.bedsAvailable ?? 'Unknown'} / ${r.hospital.bedsTotal}` },
    { label: 'ICU (sim.)', get: (r) => r.hospital.icuAvailable ?? 'Unknown' },
    { label: 'Est. travel', get: (r) => (r.minutes !== undefined ? `~${Math.round(r.minutes)} min` : '—') },
    { label: 'Est. distance', get: (r) => (r.roadKm !== undefined ? fmtDistance(r.roadKm, units) : '—') },
    { label: 'Capability match', get: (r) => (r.capabilityMatch === undefined ? '—' : r.capabilityMatch ? 'Yes' : 'No') },
    { label: 'Capabilities', get: (r) => <div className="flex flex-wrap gap-1">{r.hospital.capabilities.map((c) => <Badge key={c}>{c}</Badge>)}</div> },
    { label: 'Area', get: (r) => r.hospital.area },
    { label: 'Last update', get: (r) => timeAgo(r.hospital.lastUpdate) },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Compare hospitals" size="xl" description="Simulated availability · straight-line travel estimates">
      <div className="overflow-x-auto scroll-thin">
        <table className="table-base">
          <thead><tr><th>Attribute</th>{rows.map((r) => <th key={r.hospital.id} className="normal-case tracking-normal text-ink text-[13px]">{r.hospital.name}</th>)}</tr></thead>
          <tbody>{attrs.map((a) => <tr key={a.label}><td className="text-mute whitespace-nowrap">{a.label}</td>{rows.map((r) => <td key={r.hospital.id}>{a.get(r)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function Hospitals() {
  const hospitals = useApp((s) => s.hospitals);
  const selectedIncident = useApp((s) => s.selectedIncidentId);
  const incidents = useApp((s) => s.incidents);
  const setHospital = useApp((s) => s.setHospital);
  const units = useApp((s) => s.settings.units);
  const open = useOpenIncidents();
  const [params, setParams] = useSearchParams();
  const [refId, setRefId] = useState<string>(() => (selectedIncident && open.some((i) => i.id === selectedIncident) ? selectedIncident : open[0]?.id ?? ''));
  const [q, setQ] = useState('');
  const [cap, setCap] = useState('');
  const [status, setStatus] = useState('');
  const [maxMin, setMaxMin] = useState(90);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const refInc = incidents.find((i) => i.id === refId);
  const ranked = useMemo(() => (refInc ? rankHospitals(refInc, hospitals) : null), [refInc, hospitals]);
  const byId = useMemo(() => Object.fromEntries((ranked ?? []).map((r) => [r.hospital.id, r])), [ranked]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = hospitals.filter((h) => (!s || h.name.toLowerCase().includes(s) || h.area.toLowerCase().includes(s)) && (!cap || h.capabilities.includes(cap as Hospital['capabilities'][number])) && (!status || h.edStatus === status) && (!byId[h.id] || byId[h.id].minutes <= maxMin));
    return ranked ? list.sort((a, b) => byId[a.id].score - byId[b.id].score) : list;
  }, [hospitals, q, cap, status, maxMin, byId, ranked]);

  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? (toast('Compare limit', 'You can compare up to three hospitals.', 'warning'), c) : [...c, id]));
  const top = ranked?.filter((r) => r.eligible).slice(0, 3) ?? [];
  const drawerH = hospitals.find((h) => h.id === params.get('id'));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hospital Network"
        subtitle="Directory, simulated availability and decision-support suitability ranking."
        actions={<Button variant="primary" icon={<GitCompare className="h-3.5 w-3.5" />} disabled={compare.length < 2} onClick={() => setCompareOpen(true)}>Compare ({compare.length}/3)</Button>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-4 xl:order-2" title="Suitability for incident" icon={<Sparkles className="h-4 w-4" />} actions={<SimTag />}>
          <div className="p-4 space-y-3">
            <Select value={refId} onChange={(e) => setRefId(e.target.value)} aria-label="Reference incident">
              <option value="">No reference incident</option>
              {open.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.priority} · {i.type}</option>)}
            </Select>
            {!refInc ? <p className="text-xs text-mute">Select an incident to rank hospitals by capability, simulated capacity and travel estimate.</p> : (
              <>
                <div className="flex flex-wrap items-center gap-1.5 text-xs"><PriorityBadge p={refInc.priority} /><span>{refInc.type}</span><span className="text-mute">· {refInc.location}</span></div>
                {top.length === 0 && <p className="text-xs text-amber">No eligible hospitals.</p>}
                <ol className="space-y-2">
                  {top.map((r, i) => (
                    <li key={r.hospital.id} className={cn('rounded-md border p-3', i === 0 ? 'border-green/40 bg-green/[0.04]' : 'border-line')}>
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setParams({ id: r.hospital.id })} className="text-left text-[13px] font-medium hover:text-cyan">{i + 1}. {r.hospital.name}</button>
                        <AvailabilityBadge s={r.hospital.edStatus} />
                      </div>
                      <ul className="mt-1.5 space-y-0.5 text-[11.5px]">
                        {r.reasons.map((x) => <li key={x} className="flex gap-1 text-mute"><CheckCircle2 className="h-3 w-3 mt-0.5 text-green shrink-0" aria-hidden />{x}</li>)}
                        {r.warnings.map((x) => <li key={x} className="flex gap-1 text-amber"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />{x}</li>)}
                      </ul>
                      <Button size="xs" className="mt-2" variant={refInc.hospitalId === r.hospital.id ? 'secondary' : 'outline'} disabled={refInc.hospitalId === r.hospital.id || ['Completed', 'Cancelled'].includes(refInc.status)} onClick={() => { const res = setHospital(refInc.id, r.hospital.id); if (!res.ok) toast('Cannot select', res.error, 'danger'); }}>
                        {refInc.hospitalId === r.hospital.id ? 'Current destination' : 'Set as destination'}
                      </Button>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <Disclaimer>Decision support only — not an autonomous medical triage system. Capacity values are simulated.</Disclaimer>
          </div>
        </Panel>

        <Panel className="xl:col-span-8 xl:order-1">
          <div className="p-3 flex flex-wrap gap-2 border-b border-line items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Hospital name or area…" aria-label="Search hospitals" />
            </div>
            <Select className="w-auto" value={cap} onChange={(e) => setCap(e.target.value)} aria-label="Filter by capability"><option value="">Any capability</option>{CAPABILITIES.map((c) => <option key={c}>{c}</option>)}</Select>
            <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by availability"><option value="">Any availability</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
            {refInc && (
              <label className="flex items-center gap-2 text-xs text-mute">
                ≤ {maxMin} min
                <input type="range" min={5} max={90} step={5} value={maxMin} onChange={(e) => setMaxMin(Number(e.target.value))} className="w-24 accent-[rgb(var(--cyan))]" aria-label="Maximum estimated travel time" />
              </label>
            )}
          </div>
          {rows.length === 0 ? <EmptyState icon={<Inbox className="h-8 w-8" />} title="No hospitals match" body="Adjust the filters." /> : (
            <ul className="divide-y divide-line">
              {rows.map((h) => {
                const r = byId[h.id];
                return (
                  <li key={h.id} className="flex items-start gap-3 px-4 py-3 hover:bg-card/50">
                    <input type="checkbox" checked={compare.includes(h.id)} onChange={() => toggleCompare(h.id)} className="mt-1 accent-[rgb(var(--cyan))]" aria-label={`Compare ${h.name}`} />
                    <HIcon className="h-4 w-4 mt-0.5 text-mute shrink-0" aria-hidden />
                    <button className="min-w-0 flex-1 text-left" onClick={() => setParams({ id: h.id })}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium">{h.name}</span>
                        <AvailabilityBadge s={h.edStatus} />
                        {refInc?.hospitalId === h.id && <Badge tone="cyan">Destination of {refInc.id}</Badge>}
                      </div>
                      <div className="text-[11.5px] text-mute mt-0.5">{h.area} · Beds (sim.) {h.bedsAvailable ?? 'Unknown'}/{h.bedsTotal} · ICU {h.icuAvailable ?? 'Unknown'} · updated {timeAgo(h.lastUpdate)} · {h.source}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">{h.capabilities.map((c) => <Badge key={c}>{c}</Badge>)}</div>
                    </button>
                    {r && (
                      <div className="text-right shrink-0">
                        <div className="text-[13px] tabular-nums">~{Math.round(r.minutes)} min</div>
                        <div className="text-[10.5px] text-mute">{fmtDistance(r.roadKm, units)} est.</div>
                        <div className={cn('text-[10.5px] mt-0.5', r.capabilityMatch ? 'text-green' : 'text-amber')}>{r.capabilityMatch ? 'Capability match' : 'No match'}</div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
      <HospitalDrawer h={drawerH} onClose={() => setParams({})} refIncidentId={refId} />
      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} rows={compare.map((id) => byId[id] ?? { hospital: hospitals.find((h) => h.id === id)! })} />
    </div>
  );
}
