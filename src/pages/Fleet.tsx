import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Truck, Fuel, Inbox } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, KV, EmptyState } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Drawer, ConfirmDialog } from '../components/ui/Modal';
import { Select, Textarea } from '../components/ui/Form';
import { AmbulanceStatusBadge, Badge, AMB_TONE, TONE_HEX, PriorityBadge } from '../components/ui/Badges';
import { SimTag } from '../components/ui/Sim';
import { useApp } from '../context/store';
import { toast } from '../context/toasts';
import { useRoutes, useEtas } from '../hooks/useRoutes';
import { useMaps } from '../hooks/useEntities';
import { AMBULANCE_STATUSES, UNASSIGNED_STATUSES } from '../data/constants';
import { fmtCoords, fmtMinutes, timeAgo, fmtDateTime } from '../utils/format';
import { straightLineEstimate } from '../utils/geo';
import type { Ambulance, AmbulanceStatus } from '../types';
import { cn } from '../utils/cn';

function FuelBar({ v }: { v: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Fuel ${v} percent (demo)`}>
      <div className="h-1.5 w-14 rounded-full bg-card overflow-hidden"><div className={cn('h-full', v < 35 ? 'bg-red' : v < 60 ? 'bg-amber' : 'bg-green')} style={{ width: `${v}%` }} /></div>
      <span className="text-[11px] tabular-nums text-mute">{v}%</span>
    </div>
  );
}

function AmbulanceDrawer({ amb, onClose }: { amb: Ambulance | undefined; onClose: () => void }) {
  const incidents = useApp((s) => s.incidents);
  const hospitals = useApp((s) => s.hospitals);
  const setNotes = useApp((s) => s.setAmbulanceNotes);
  const setStatus = useApp((s) => s.setAmbulanceStatus);
  const assign = useApp((s) => s.assignAmbulance);
  const inc = incidents.find((i) => i.id === amb?.incidentId);
  const analysis = useRoutes(inc);
  const [notes, setLocalNotes] = useState('');
  const [target, setTarget] = useState('');
  const [confirm, setConfirm] = useState<null | { kind: 'status'; status: AmbulanceStatus } | { kind: 'assign'; incidentId: string }>(null);
  useEffect(() => { setLocalNotes(amb?.notes ?? ''); setTarget(''); }, [amb?.id, amb?.notes]);
  const candidates = useMemo(() => (amb ? incidents.filter((i) => UNASSIGNED_STATUSES.includes(i.status)).map((i) => ({ i, min: straightLineEstimate(amb.coords, i.coords).minutes })).sort((a, b) => a.min - b.min) : []), [incidents, amb]);
  if (!amb) return null;
  const hsp = hospitals.find((h) => h.id === amb.hospitalId);
  const canAssign = amb.status === 'Available';
  return (
    <>
      <Drawer
        open={!!amb}
        onClose={onClose}
        title={`${amb.id} · ${amb.callSign}`}
        subtitle={<span className="flex items-center gap-2"><AmbulanceStatusBadge s={amb.status} /><Badge tone={amb.type === 'ALS' ? 'cyan' : 'mute'}>{amb.type}</Badge><SimTag /></span>}
      >
        <div className="space-y-5">
          <section>
            <div className="label mb-1">Vehicle</div>
            <KV k="Vehicle identifier" v={amb.id} mono />
            <KV k="Base station" v={amb.base} />
            <KV k="Crew" v={amb.crew} />
            <KV k="Simulated coordinates" v={fmtCoords(amb.coords)} mono />
            <KV k="Last simulated update" v={`${timeAgo(amb.lastUpdate)} · ${fmtDateTime(amb.lastUpdate)}`} />
            <KV k="Fuel (demo data)" v={<FuelBar v={amb.fuelPct} />} />
            <KV k="Next maintenance" v={fmtDateTime(amb.maintenanceDue)} />
          </section>
          <section>
            <div className="label mb-1">Assignment</div>
            <KV k="Assigned incident" v={inc ? <Link to={`/incidents/${inc.id}`} className="text-cyan hover:underline">{inc.id} · {inc.type}</Link> : '—'} />
            <KV k="Destination hospital" v={hsp?.name ?? '—'} />
            <KV k="Current route" v={analysis ? `Route ${analysis.selected.id} (${analysis.selected.strategy}) · ${fmtMinutes(analysis.selected.travelMin)}` : '—'} />
          </section>
          {canAssign && (
            <section className="space-y-2">
              <div className="label">Assign to incident</div>
              {candidates.length === 0 ? <p className="text-xs text-mute">No incidents are awaiting assignment.</p> : (
                <div className="flex gap-2">
                  <Select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Incident to assign">
                    <option value="">Select incident…</option>
                    {candidates.map(({ i, min }) => <option key={i.id} value={i.id}>{i.id} · {i.priority} · {i.type} (~{Math.round(min)} min)</option>)}
                  </Select>
                  <Button variant="primary" disabled={!target} onClick={() => setConfirm({ kind: 'assign', incidentId: target })}>Assign</Button>
                </div>
              )}
            </section>
          )}
          <section className="space-y-2">
            <div className="label">Operational status</div>
            {amb.incidentId ? (
              <p className="text-xs text-mute">Status follows the incident workflow while assigned. Change it from <Link to={`/incidents/${amb.incidentId}`} className="text-cyan hover:underline">{amb.incidentId}</Link>.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(['Available', 'Offline', 'Maintenance'] as AmbulanceStatus[]).map((s) => (
                  <Button key={s} size="xs" variant={amb.status === s ? 'secondary' : 'outline'} disabled={amb.status === s} onClick={() => setConfirm({ kind: 'status', status: s })}>Set {s}</Button>
                ))}
              </div>
            )}
          </section>
          <section className="space-y-2">
            <label className="label" htmlFor="amb-notes">Operational notes</label>
            <Textarea id="amb-notes" value={notes} onChange={(e) => setLocalNotes(e.target.value)} placeholder="Notes for the next shift (demo)…" />
            <Button size="xs" disabled={notes === amb.notes} onClick={() => { setNotes(amb.id, notes); toast('Notes saved', amb.id, 'success'); }}>Save notes</Button>
          </section>
        </div>
      </Drawer>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'assign' ? `Assign ${amb.id} to ${confirm.incidentId}?` : `Set ${amb.id} to ${confirm?.kind === 'status' ? confirm.status : ''}?`}
        body={confirm?.kind === 'assign' ? (
          <span className="flex items-center gap-2 flex-wrap">The unit will be marked Assigned (simulated). {(() => { const i = incidents.find((x) => x.id === confirm.incidentId); return i ? <PriorityBadge p={i.priority} /> : null; })()}</span>
        ) : confirm?.kind === 'status' && confirm.status !== 'Available' ? 'The unit will not be offered for new assignments.' : 'The unit will be offered for assignments again.'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          const r = confirm.kind === 'assign' ? assign(confirm.incidentId, amb.id) : setStatus(amb.id, confirm.status);
          if (!r.ok) toast('Action blocked', r.error, 'danger');
          setConfirm(null);
          setTarget('');
        }}
      />
    </>
  );
}

export default function Fleet() {
  const ambulances = useApp((s) => s.ambulances);
  const incidents = useApp((s) => s.incidents);
  const { incById, hspById } = useMaps();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const selected = ambulances.find((a) => a.id === params.get('id'));
  const assignedIncidents = useMemo(() => incidents.filter((i) => ambulances.some((a) => a.incidentId === i.id)), [incidents, ambulances]);
  const etas = useEtas(assignedIncidents);

  const counts = useMemo(() => {
    const c = Object.fromEntries(AMBULANCE_STATUSES.map((s) => [s, 0])) as Record<AmbulanceStatus, number>;
    ambulances.forEach((a) => c[a.status]++);
    return c;
  }, [ambulances]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ambulances.filter((a) => (!status || a.status === status) && (!type || a.type === type) && (!s || [a.id, a.callSign, a.base, a.incidentId ?? ''].some((v) => v.toLowerCase().includes(s))));
  }, [ambulances, q, status, type]);

  const utilisation = Math.round((ambulances.filter((a) => a.incidentId).length / Math.max(1, ambulances.filter((a) => !['Offline', 'Maintenance'].includes(a.status)).length)) * 100);

  return (
    <div className="space-y-4">
      <PageHeader title="Ambulance Fleet" subtitle="Simulated fleet status, assignments and vehicle details." actions={<SimTag>SIMULATED FLEET</SimTag>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {AMBULANCE_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(status === s ? '' : s)} aria-pressed={status === s} className={cn('panel px-3 py-2.5 text-left hover:border-mute/50', status === s && 'border-cyan')}>
            <div className="text-[10.5px] text-mute truncate">{s}</div>
            <div className="text-xl font-semibold tabular-nums" style={{ color: counts[s] ? TONE_HEX[AMB_TONE(s)] : undefined }}>{counts[s]}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-mute">{ambulances.length} units · {utilisation}% of operational units currently on assignment (simulated).</p>

      <Panel>
        <div className="p-3 flex flex-wrap gap-2 border-b border-line">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search vehicle ID, call sign, base, incident…" aria-label="Search fleet" />
          </div>
          <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{AMBULANCE_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select className="w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type"><option value="">ALS + BLS</option><option>ALS</option><option>BLS</option></Select>
        </div>
        {rows.length === 0 ? <EmptyState icon={<Inbox className="h-8 w-8" />} title="No units match" body="Adjust search or filters." /> : (
          <>
            <div className="overflow-x-auto scroll-thin hidden md:block">
              <table className="table-base">
                <thead><tr><th>Vehicle</th><th>Type</th><th>Status</th><th>Current incident</th><th>Destination</th><th className="text-right">Sim. ETA</th><th>Location (sim.)</th><th>Fuel (demo)</th><th>Maintenance</th><th className="text-right">Updated</th></tr></thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className={cn('clickable', selected?.id === a.id && 'bg-cyan/[0.07]')} tabIndex={0} onClick={() => setParams({ id: a.id })} onKeyDown={(e) => e.key === 'Enter' && setParams({ id: a.id })}>
                      <td><div className="font-mono text-xs">{a.id}</div><div className="text-[11px] text-mute">{a.callSign} · {a.base}</div></td>
                      <td><Badge tone={a.type === 'ALS' ? 'cyan' : 'mute'}>{a.type}</Badge></td>
                      <td><AmbulanceStatusBadge s={a.status} /></td>
                      <td>{a.incidentId ? <><span className="font-mono text-xs">{a.incidentId}</span><div className="text-[11px] text-mute">{incById[a.incidentId]?.type}</div></> : <span className="text-mute">—</span>}</td>
                      <td className="max-w-[160px] truncate">{a.hospitalId ? hspById[a.hospitalId]?.name.replace(' (Demo)', '') : <span className="text-mute">—</span>}</td>
                      <td className="text-right tabular-nums">{a.incidentId ? fmtMinutes(etas[a.incidentId]) : '—'}</td>
                      <td className="font-mono text-[11px] text-mute">{fmtCoords(a.coords)}</td>
                      <td><FuelBar v={a.fuelPct} /></td>
                      <td>{a.status === 'Maintenance' ? <Badge tone="amber">In maintenance</Badge> : <span className="text-[11px] text-mute">Due {new Date(a.maintenanceDue).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}</td>
                      <td className="text-right text-[11px] text-mute whitespace-nowrap">{timeAgo(a.lastUpdate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-line">
              {rows.map((a) => (
                <li key={a.id}>
                  <button className="w-full text-left px-4 py-3 flex items-start gap-3" onClick={() => setParams({ id: a.id })}>
                    <Truck className="h-4 w-4 text-mute mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between"><span className="font-mono text-xs">{a.id} · {a.callSign}</span><Badge tone={a.type === 'ALS' ? 'cyan' : 'mute'}>{a.type}</Badge></div>
                      <div className="mt-1"><AmbulanceStatusBadge s={a.status} /></div>
                      <div className="text-[11px] text-mute mt-1 flex items-center gap-2">{a.incidentId ?? 'No incident'} · <Fuel className="h-3 w-3" aria-hidden />{a.fuelPct}%</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <AmbulanceDrawer amb={selected} onClose={() => setParams({})} />
    </div>
  );
}
