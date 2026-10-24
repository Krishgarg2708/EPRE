import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, UserPlus, Hospital as HIcon, Send, XCircle, CheckCircle2, ArrowRight, Route as RouteIcon, History, TrafficCone, FileText, ListChecks } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, KV, EmptyState } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { Select } from '../components/ui/Form';
import { PriorityBadge, IncidentStatusBadge, Badge, SignalBadge, AvailabilityBadge } from '../components/ui/Badges';
import { Disclaimer, SimTag } from '../components/ui/Sim';
import { WorkflowStepper } from '../components/incidents/Workflow';
import { IncidentFormModal } from '../components/incidents/IncidentForm';
import { AssignAmbulanceModal } from '../components/incidents/AssignAmbulanceModal';
import { HospitalPickerModal } from '../components/hospitals/HospitalPickerModal';
import { OpsMap } from '../components/maps/OpsMap';
import { RouteRow, Explanation } from '../components/routing/RouteBits';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { useApp, INTERSECTIONS_BY_ID } from '../context/store';
import { toast } from '../context/toasts';
import { useRoutes } from '../hooks/useRoutes';
import { remainingEta } from '../utils/analysis';
import { rankHospitals } from '../utils/recommend';
import { INCIDENT_STATUSES } from '../data/constants';
import { fmtCoords, fmtDateTime, fmtMinutes, fmtTime, timeAgo, fmtDistance } from '../utils/format';
import type { IncidentStatus } from '../types';

interface Pending { status: IncidentStatus; title: string; body: string; tone: 'primary' | 'danger' }

export default function IncidentDetail() {
  const { id } = useParams();
  const incident = useApp((s) => s.incidents.find((i) => i.id === id));
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const signalRequests = useApp((s) => s.signalRequests);
  const units = useApp((s) => s.settings.units);
  const setStatus = useApp((s) => s.setIncidentStatus);
  const selectRoute = useApp((s) => s.selectRoute);
  const setHospital = useApp((s) => s.setHospital);
  const analysis = useRoutes(incident);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [hspOpen, setHspOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const hRank = useMemo(() => (incident ? rankHospitals(incident, hospitals).slice(0, 3) : []), [incident, hospitals]);

  if (!incident) {
    return (
      <div className="space-y-4">
        <PageHeader title="Incident not found" crumb={id} />
        <Panel><EmptyState title={`No incident with ID ${id}`} body="It may have been removed by a demo data reset." action={<Link className="text-cyan hover:underline text-sm" to="/incidents">Back to incidents</Link>} /></Panel>
      </div>
    );
  }

  const amb = ambulances.find((a) => a.id === incident.ambulanceId);
  const hsp = hospitals.find((h) => h.id === incident.hospitalId);
  const closed = incident.status === 'Completed' || incident.status === 'Cancelled';
  const eta = remainingEta(incident, analysis);
  const signals = signalRequests.filter((r) => r.incidentId === incident.id);

  const apply = (status: IncidentStatus) => {
    const r = setStatus(incident.id, status);
    if (!r.ok) toast('Status not changed', r.error, 'danger');
  };
  const requestStatus = (status: IncidentStatus) => {
    if (status === 'Cancelled') return setPending({ status, title: `Cancel ${incident.id}?`, body: 'The incident will be closed as Cancelled and any assigned unit released back to Available. This cannot be undone in the demo.', tone: 'danger' });
    if (status === 'Completed') return setPending({ status, title: `Complete ${incident.id}?`, body: 'Marks the incident as Completed and releases the unit at the destination hospital.', tone: 'primary' });
    if (status === 'Dispatched') return setPending({ status, title: 'Simulate dispatch?', body: `${incident.ambulanceId} will be marked as dispatched on Route ${analysis?.selected.id ?? 'A'}. No real vehicle is dispatched.`, tone: 'primary' });
    apply(status);
  };

  // Primary next action for the workflow
  let next: { label: string; icon: JSX.Element; run: () => void } | null = null;
  switch (incident.status) {
    case 'New': next = { label: 'Review & queue for assignment', icon: <ListChecks className="h-4 w-4" />, run: () => apply('Awaiting Assignment') }; break;
    case 'Awaiting Assignment': next = { label: 'Assign ambulance', icon: <UserPlus className="h-4 w-4" />, run: () => setAssignOpen(true) }; break;
    case 'Assigned': next = { label: 'Simulate dispatch', icon: <Send className="h-4 w-4" />, run: () => requestStatus('Dispatched') }; break;
    case 'Dispatched': next = { label: 'Mark en route', icon: <ArrowRight className="h-4 w-4" />, run: () => apply('En Route') }; break;
    case 'En Route': next = { label: 'Mark at pickup', icon: <ArrowRight className="h-4 w-4" />, run: () => apply('At Pickup') }; break;
    case 'At Pickup': next = hsp ? { label: 'Start transport', icon: <ArrowRight className="h-4 w-4" />, run: () => apply('Transporting') } : { label: 'Select hospital', icon: <HIcon className="h-4 w-4" />, run: () => setHspOpen(true) }; break;
    case 'Transporting': next = { label: 'Mark arrived at hospital', icon: <ArrowRight className="h-4 w-4" />, run: () => apply('Arrived at Hospital') }; break;
    case 'Arrived at Hospital': next = { label: 'Complete incident', icon: <CheckCircle2 className="h-4 w-4" />, run: () => requestStatus('Completed') }; break;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${incident.id} · ${incident.type}`}
        crumb={incident.id}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><PriorityBadge p={incident.priority} /><IncidentStatusBadge s={incident.status} /><span>{incident.location}</span><span className="text-mute">· opened {timeAgo(incident.createdAt)}</span></span>}
        actions={
          !closed && (
            <>
              <Button icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>Edit</Button>
              <Button variant="outline" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => requestStatus('Cancelled')} className="text-red border-red/40">Cancel incident</Button>
              {next && <Button variant="primary" icon={next.icon} onClick={next.run}>{next.label}</Button>}
            </>
          )
        }
      />

      <Panel>
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <WorkflowStepper status={incident.status} />
          {!closed && (
            <label className="flex items-center gap-2 text-xs shrink-0">
              <span className="text-mute">Set status</span>
              <Select className="h-8 w-auto text-xs" value="" onChange={(e) => e.target.value && requestStatus(e.target.value as IncidentStatus)} aria-label="Set incident status manually">
                <option value="">Choose…</option>
                {INCIDENT_STATUSES.filter((s) => s !== incident.status).map((s) => <option key={s}>{s}</option>)}
              </Select>
            </label>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 space-y-4">
          <Panel title="Incident details" icon={<FileText className="h-4 w-4" />} actions={<SimTag>DEMO RECORD</SimTag>}>
            <div className="p-4">
              <KV k="Emergency type" v={incident.type} />
              <KV k="Priority" v={<PriorityBadge p={incident.priority} />} />
              <KV k="Area" v={incident.area} />
              <KV k="Coordinates" v={fmtCoords(incident.coords)} mono />
              <KV k="Created" v={fmtDateTime(incident.createdAt)} />
              <KV k="Condition summary" v={incident.conditionSummary} />
              {incident.contact && <KV k="Contact (demo)" v={incident.contact} />}
              {incident.notes && <KV k="Notes" v={incident.notes} />}
              {incident.responseMin !== undefined && <KV k="Sim. response time" v={`${incident.responseMin} min`} />}
            </div>
          </Panel>
          <Panel title="Assignment" icon={<UserPlus className="h-4 w-4" />} actions={!closed && <Button size="xs" onClick={() => setAssignOpen(true)}>{amb ? 'Reassign' : 'Assign'}</Button>}>
            <div className="p-4">
              {amb ? (
                <>
                  <KV k="Ambulance" v={<Link className="text-cyan hover:underline" to={`/fleet?id=${amb.id}`}>{amb.id} · {amb.callSign}</Link>} />
                  <KV k="Type / crew" v={`${amb.type} · ${amb.crew} crew`} />
                  <KV k="Unit status" v={amb.status} />
                  <KV k="Sim. ETA (remaining)" v={fmtMinutes(eta)} />
                </>
              ) : (
                <p className="text-sm text-amber">No ambulance assigned.</p>
              )}
            </div>
          </Panel>
          <Panel title="Destination hospital" icon={<HIcon className="h-4 w-4" />} actions={!closed && <Button size="xs" onClick={() => setHspOpen(true)}>{hsp ? 'Change' : 'Select'}</Button>}>
            <div className="p-4 space-y-3">
              {hsp ? (
                <div>
                  <Link to={`/hospitals?id=${hsp.id}`} className="text-[13px] font-medium hover:text-cyan">{hsp.name}</Link>
                  <div className="mt-1 flex items-center gap-2"><AvailabilityBadge s={hsp.edStatus} /><span className="text-[11px] text-mute">Pre-alert prepared (simulated)</span></div>
                </div>
              ) : (
                <p className="text-sm text-mute">No destination selected.</p>
              )}
              {!closed && (
                <div>
                  <div className="label mb-1.5">Top suggestions</div>
                  <ul className="space-y-1">
                    {hRank.map((r) => (
                      <li key={r.hospital.id} className="flex items-center justify-between gap-2 text-[12px]">
                        <div className="min-w-0">
                          <div className="truncate">{r.hospital.name.replace(' (Demo)', '')}</div>
                          <div className="text-[10.5px] text-mute truncate">{r.capabilityMatch ? 'Capability match' : 'No capability match'} · ~{Math.round(r.minutes)} min · {r.hospital.edStatus}</div>
                        </div>
                        <Button size="xs" variant="ghost" disabled={!r.eligible || r.hospital.id === hsp?.id} onClick={() => { const res = setHospital(incident.id, r.hospital.id); if (!res.ok) toast('Cannot select', res.error, 'danger'); }}>{r.hospital.id === hsp?.id ? 'Selected' : 'Select'}</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <Panel title="Route review" icon={<RouteIcon className="h-4 w-4" />} actions={<><SimTag /><Link to={`/routes?incident=${incident.id}`} className="text-xs text-cyan hover:underline ml-2">Full comparison →</Link></>}>
            {closed ? (
              <EmptyState title="Incident closed" body={incident.routeUsed ? `Route ${incident.routeUsed} was used for the pickup leg (simulated).` : 'No active route.'} />
            ) : !analysis ? (
              <EmptyState title="No route available" body="Assign an ambulance or make a unit available to preview routes." />
            ) : (
              <div className="grid md:grid-cols-2">
                <OpsMap
                  className="h-[320px] md:h-full min-h-[320px] rounded-none border-0 md:border-r md:border-line"
                  incidents={[incident]}
                  ambulances={amb ? [amb] : []}
                  hospitals={hsp ? [hsp] : []}
                  routes={analysis.routes}
                  selectedRouteId={analysis.selected.id}
                  onSelectRoute={(r) => selectRoute(incident.id, r)}
                  hospitalLeg={hsp && analysis.leg === 'pickup' ? { from: incident.coords, to: hsp.coords, label: 'Onward to hospital' } : null}
                  selectedIncidentId={incident.id}
                  signalIncidentId={incident.id}
                  compactToolbar
                />
                <div className="p-4 space-y-3">
                  <div className="text-[11px] text-mute">{analysis.leg === 'hospital' ? 'Hospital leg' : 'Pickup leg'} · {analysis.originLabel}</div>
                  <div className="space-y-1.5">{analysis.routes.map((r) => <RouteRow key={r.id} r={r} selected={r.id === analysis.selected.id} onSelect={() => selectRoute(incident.id, r.id)} />)}</div>
                  <div className="text-[12px] text-mute">Selected: Route {analysis.selected.id} · {fmtMinutes(analysis.selected.travelMin)} · {fmtDistance(analysis.selected.distanceKm, units)}</div>
                  <Explanation {...analysis.explanation} />
                </div>
              </div>
            )}
          </Panel>

          <div className="grid md:grid-cols-2 gap-4">
            <Panel title="Status timeline" icon={<History className="h-4 w-4" />} bodyClass="max-h-[340px] overflow-y-auto scroll-thin">
              <ol className="p-4 space-y-3">
                {[...incident.timeline].reverse().map((t, i) => (
                  <li key={`${t.at}-${i}`} className="flex gap-3">
                    <span className="font-mono text-[11px] text-mute w-11 shrink-0 pt-0.5">{fmtTime(t.at)}</span>
                    <div className="min-w-0">
                      <IncidentStatusBadge s={t.status} />
                      {t.note && <div className="text-[11.5px] text-mute mt-0.5">{t.note}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Signal-priority requests" icon={<TrafficCone className="h-4 w-4" />} actions={<Link to={`/traffic?incident=${incident.id}`} className="text-xs text-cyan hover:underline">Manage →</Link>} bodyClass="max-h-[340px] overflow-y-auto scroll-thin">
              {signals.length === 0 ? (
                <EmptyState title="No simulated requests" body="Use Traffic & Signal Priority to simulate a request on this route." />
              ) : (
                <ul className="p-4 space-y-2">
                  {signals.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <div className="min-w-0"><div className="truncate">{INTERSECTIONS_BY_ID[r.intersectionId]?.name}</div><div className="text-[10.5px] text-mute">Route {r.routeId} · {fmtTime(r.requestedAt)}</div></div>
                      <SignalBadge s={r.status} short />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <ActivityFeed limit={10} filterIncident={incident.id} className="max-h-[360px]" />
        </div>
      </div>
      <Disclaimer>Decision-support prototype. Status changes only update simulated data; no real dispatch, hospital notification or signal control takes place.</Disclaimer>

      <IncidentFormModal open={editOpen} onClose={() => setEditOpen(false)} editing={incident} />
      <AssignAmbulanceModal incident={incident} open={assignOpen} onClose={() => setAssignOpen(false)} />
      <HospitalPickerModal incident={incident} open={hspOpen} onClose={() => setHspOpen(false)} />
      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ''}
        body={pending?.body}
        tone={pending?.tone}
        confirmLabel={pending?.status === 'Cancelled' ? 'Cancel incident' : 'Confirm'}
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending) apply(pending.status); setPending(null); }}
      />
      {incident.hospitalId && !hsp && <Badge tone="red">Destination record missing</Badge>}
    </div>
  );
}
