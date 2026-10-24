import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Route, Ambulance, Hospital, ExternalLink, AlertTriangle, UserPlus } from 'lucide-react';
import { Panel, EmptyState, Skeleton } from '../ui/Panel';
import { Button } from '../ui/Button';
import { SimTag } from '../ui/Sim';
import { PriorityBadge, IncidentStatusBadge, Badge } from '../ui/Badges';
import { useApp } from '../../context/store';
import { useRoutes } from '../../hooks/useRoutes';
import { useRecalculate } from '../../hooks/useRecalculate';
import { useOpenIncidents } from '../../hooks/useEntities';
import { RouteRow, DelayFactors, Explanation, ConfidenceBar } from './RouteBits';
import { fmtDistance, fmtMinutes } from '../../utils/format';
import { rankAmbulances, rankHospitals } from '../../utils/recommend';
import { AssignAmbulanceModal } from '../incidents/AssignAmbulanceModal';
import { HospitalPickerModal } from '../hospitals/HospitalPickerModal';
import { TRAFFIC_SLICES } from '../../data/constants';

export function RouteRecommendation({ className }: { className?: string }) {
  const selectedId = useApp((s) => s.selectedIncidentId);
  const selectIncident = useApp((s) => s.selectIncident);
  const selectRoute = useApp((s) => s.selectRoute);
  const incidents = useApp((s) => s.incidents);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const units = useApp((s) => s.settings.units);
  const slice = useApp((s) => s.trafficSlice);
  const open = useOpenIncidents();
  const incident = incidents.find((i) => i.id === selectedId);
  const analysis = useRoutes(incident);
  const { busy, run } = useRecalculate(incident, analysis);
  const [assignOpen, setAssignOpen] = useState(false);
  const [hspOpen, setHspOpen] = useState(false);

  const amb = ambulances.find((a) => a.id === incident?.ambulanceId);
  const hsp = hospitals.find((h) => h.id === incident?.hospitalId);
  const suggestedAmb = incident && !amb ? rankAmbulances(incident, ambulances).find((r) => r.available) : undefined;
  const suggestedHsp = incident && !hsp ? rankHospitals(incident, hospitals).find((r) => r.eligible) : undefined;

  return (
    <Panel
      title="Route Recommendation"
      icon={<Route className="h-4 w-4" />}
      className={className}
      actions={<SimTag />}
      bodyClass="overflow-y-auto scroll-thin"
    >
      <div className="p-4 space-y-4">
        <label className="block">
          <span className="sr-only">Selected incident</span>
          <select value={selectedId ?? ''} onChange={(e) => selectIncident(e.target.value || null)} className="input h-8 text-[13px]">
            <option value="">Select an active incident…</option>
            {open.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.priority} · {i.type} — {i.location}</option>)}
          </select>
        </label>

        {!incident ? (
          <EmptyState icon={<Route className="h-8 w-8" />} title="No incident selected" body="Pick an incident from the queue, the map, or the selector above." />
        ) : busy ? (
          <div className="space-y-2" aria-live="polite" aria-busy>
            <p className="text-xs text-mute">Recalculating with current simulated inputs…</p>
            <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <PriorityBadge p={incident.priority} />
              <IncidentStatusBadge s={incident.status} />
              <Badge>{incident.type}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-md border border-line px-2.5 py-2 min-w-0">
                <div className="text-[10.5px] text-mute flex items-center gap-1"><Ambulance className="h-3 w-3" aria-hidden />{amb ? 'Assigned unit' : 'Recommended unit'}</div>
                {amb ? <div className="truncate mt-0.5">{amb.id} · {amb.callSign}</div> : suggestedAmb ? (
                  <button onClick={() => setAssignOpen(true)} className="mt-0.5 text-cyan hover:underline flex items-center gap-1 truncate"><UserPlus className="h-3 w-3" />{suggestedAmb.ambulance.id} · assign</button>
                ) : <div className="text-amber mt-0.5">None available</div>}
              </div>
              <div className="rounded-md border border-line px-2.5 py-2 min-w-0">
                <div className="text-[10.5px] text-mute flex items-center gap-1"><Hospital className="h-3 w-3" aria-hidden />{hsp ? 'Destination' : 'Suggested hospital'}</div>
                {hsp ? <button onClick={() => setHspOpen(true)} className="truncate mt-0.5 block max-w-full text-left hover:text-cyan" title={hsp.name}>{hsp.name.replace(' (Demo)', '')}</button> : suggestedHsp ? (
                  <button onClick={() => setHspOpen(true)} className="mt-0.5 text-cyan hover:underline truncate block max-w-full text-left" title={suggestedHsp.hospital.name}>{suggestedHsp.hospital.name.replace(' (Demo)', '')}</button>
                ) : <div className="text-amber mt-0.5">None eligible</div>}
              </div>
            </div>

            {!analysis ? (
              <EmptyState title="No route available" body="No available ambulance to compute a preview route from." />
            ) : (
              <>
                {analysis.stale && (
                  <div className="flex items-start gap-2 text-[11.5px] text-amber rounded-md border border-amber/30 bg-amber/[0.06] px-2.5 py-2" role="status">
                    <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />
                    Simulated traffic snapshot changed to “{TRAFFIC_SLICES.find((s) => s.id === slice)?.label}”. Recalculate to apply it.
                  </div>
                )}
                <div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="label">{analysis.leg === 'hospital' ? 'Hospital leg' : 'Pickup leg'} · Route {analysis.selected.id}</div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-semibold tabular-nums">{fmtMinutes(analysis.selected.travelMin)}</span>
                        <span className="text-sm text-mute">{fmtDistance(analysis.selected.distanceKm, units)}</span>
                      </div>
                    </div>
                    <ConfidenceBar v={analysis.selected.confidence} />
                  </div>
                  <p className="text-[11px] text-mute mt-1 truncate" title={analysis.originLabel}>{analysis.originLabel}</p>
                </div>

                <div className="space-y-1.5">
                  {analysis.routes.map((r) => (
                    <RouteRow key={r.id} r={r} selected={r.id === analysis.selected.id} onSelect={() => selectRoute(incident.id, r.id)} />
                  ))}
                </div>

                <DelayFactors r={analysis.selected} />
                <Explanation {...analysis.explanation} />
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="primary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={run} loading={busy} disabled={!analysis}>Recalculate Route</Button>
              <Link to={`/routes?incident=${incident.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-md border border-line hover:bg-card">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />Route Intelligence
              </Link>
            </div>
            <p className="text-[10.5px] text-mute">Simulated road geometry and travel times. Decision support only; does not replace dispatcher judgement.</p>
          </>
        )}
      </div>
      <AssignAmbulanceModal incident={incident} open={assignOpen} onClose={() => setAssignOpen(false)} />
      <HospitalPickerModal incident={incident} open={hspOpen} onClose={() => setHspOpen(false)} />
    </Panel>
  );
}
