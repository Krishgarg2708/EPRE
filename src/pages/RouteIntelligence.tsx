import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { RefreshCw, Route as RouteIcon, BarChart3, Sigma, CheckCircle2, AlertTriangle, TrafficCone, MapPin } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, EmptyState, Skeleton } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge, PriorityBadge, IncidentStatusBadge, SignalBadge } from '../components/ui/Badges';
import { SimTag, Disclaimer } from '../components/ui/Sim';
import { Tooltip } from '../components/ui/Tooltip';
import { OpsMap } from '../components/maps/OpsMap';
import { ConfidenceBar, DelayFactors, Explanation } from '../components/routing/RouteBits';
import { ScoreBreakdownChart, EtaRangeChart } from '../components/routing/ScoreChart';
import { WeightsPanel } from '../components/routing/WeightsPanel';
import { useApp, SEGMENTS_BY_ID, INTERSECTIONS_BY_ID } from '../context/store';
import { useRoutes } from '../hooks/useRoutes';
import { useRecalculate } from '../hooks/useRecalculate';
import { useOpenIncidents } from '../hooks/useEntities';
import { TRAFFIC_SLICES, congestionLevel } from '../data/constants';
import { fmtDistance, fmtMinutes, pct } from '../utils/format';
import { cn } from '../utils/cn';
import type { ScoredRoute } from '../types';

function RouteCard({ r, selected, onSelect, units }: { r: ScoredRoute; selected: boolean; onSelect: () => void; units: 'km' | 'mi' }) {
  return (
    <div className={cn('panel p-4 flex flex-col gap-3 transition-colors', selected && 'border-cyan shadow-[0_0_0_1px_rgb(var(--cyan)/0.5)]', r.rank === 1 && !selected && 'border-green/40')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('h-8 w-8 rounded-md grid place-items-center font-bold', r.rank === 1 ? 'bg-green/15 text-green' : 'bg-card text-mute')}>{r.id}</span>
            <div>
              <div className="text-[13px] font-semibold">Route {r.id} — {r.strategy}</div>
              <div className="text-[11px] text-mute">via {r.via}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="label">Rank</div>
          <div className={cn('text-lg font-semibold', r.rank === 1 ? 'text-green' : 'text-mute')}>#{r.rank}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {r.rank === 1 && <Badge tone="green" icon={<CheckCircle2 className="h-3 w-3" />}>Recommended</Badge>}
        {r.tags.map((t) => <Badge key={t} tone="cyan">{t}</Badge>)}
        {r.missing.length > 0 && <Badge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>Missing data</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <div><div className="text-[10.5px] text-mute">Est. travel time</div><div className="text-xl font-semibold tabular-nums">{fmtMinutes(r.travelMin)}</div></div>
        <div><div className="text-[10.5px] text-mute">Distance</div><div className="text-xl font-semibold tabular-nums">{fmtDistance(r.distanceKm, units)}</div></div>
        <div><div className="text-[10.5px] text-mute">Weighted score</div><div className="tabular-nums">{r.score.toFixed(3)} <span className="text-[10px] text-mute">(lower is better)</span></div></div>
        <div><div className="text-[10.5px] text-mute">Input completeness</div><ConfidenceBar v={r.confidence} /></div>
      </div>
      <DelayFactors r={r} />
      <Button variant={selected ? 'secondary' : 'primary'} onClick={onSelect} disabled={selected} className="mt-auto">{selected ? 'Selected route' : `Select Route ${r.id}`}</Button>
    </div>
  );
}

export default function RouteIntelligence() {
  const [params, setParams] = useSearchParams();
  const storeSelected = useApp((s) => s.selectedIncidentId);
  const selectIncident = useApp((s) => s.selectIncident);
  const selectRoute = useApp((s) => s.selectRoute);
  const incidents = useApp((s) => s.incidents);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const units = useApp((s) => s.settings.units);
  const slice = useApp((s) => s.trafficSlice);
  const calcSlice = useApp((s) => s.calcSlice);
  const signalRequests = useApp((s) => s.signalRequests);
  const open = useOpenIncidents();
  const id = params.get('incident') ?? storeSelected ?? open[0]?.id ?? null;
  const incident = incidents.find((i) => i.id === id);
  const analysis = useRoutes(incident);
  const { busy, run } = useRecalculate(incident, analysis);

  useEffect(() => {
    if (id && id !== storeSelected) selectIncident(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const choose = (v: string) => setParams(v ? { incident: v } : {});
  const usedSlice = incident ? calcSlice[incident.id] ?? slice : slice;
  const sel = analysis?.selected;
  const amb = ambulances.find((a) => a.id === incident?.ambulanceId);
  const relevant = incident ? [incident] : [];
  const mapAmbs = amb ? [amb] : analysis?.previewAmbulanceId ? ambulances.filter((a) => a.id === analysis.previewAmbulanceId) : [];
  const mapHsp = hospitals.filter((h) => h.id === incident?.hospitalId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Route Intelligence"
        subtitle="Compare candidate routes with a transparent, deterministic scoring model. Every recommendation shows why."
        actions={
          <>
            <select value={id ?? ''} onChange={(e) => choose(e.target.value)} className="input h-8 text-[13px] w-auto max-w-[340px]" aria-label="Select incident">
              {!incident && <option value="">Select incident…</option>}
              {incidents.filter((i) => !['Completed', 'Cancelled'].includes(i.status) || i.id === id).map((i) => <option key={i.id} value={i.id}>{i.id} · {i.priority} · {i.type} — {i.location}</option>)}
            </select>
            <Button variant="primary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={run} loading={busy} disabled={!analysis}>Recalculate Routes</Button>
          </>
        }
      />

      {!incident ? (
        <Panel><EmptyState icon={<RouteIcon className="h-8 w-8" />} title="Select an incident" body="Choose an active incident to compare simulated route alternatives." /></Panel>
      ) : !analysis ? (
        <Panel><EmptyState title="No route can be computed" body="No ambulance is assigned and no unit is currently available for a preview route." action={<Link className="text-cyan hover:underline text-sm" to={`/incidents/${incident.id}`}>Open incident</Link>} /></Panel>
      ) : (
        <>
          <div className="panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
            <div className="flex items-center gap-2"><PriorityBadge p={incident.priority} /><IncidentStatusBadge s={incident.status} /><span className="font-mono text-xs">{incident.id}</span></div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-mute" aria-hidden />{incident.type} · {incident.location}</div>
            <div className="text-mute">Leg: <span className="text-ink">{analysis.leg === 'hospital' ? 'Hospital transport' : 'Pickup response'}</span> · {analysis.originLabel}</div>
            <div className="text-mute">Traffic snapshot used: <span className={cn(analysis.stale ? 'text-amber' : 'text-ink')}>{TRAFFIC_SLICES.find((s) => s.id === usedSlice)?.label}</span>{analysis.stale && ' (stale — recalculate)'}</div>
            <SimTag className="ml-auto" />
          </div>

          {busy ? (
            <div className="grid md:grid-cols-3 gap-4" aria-busy><Skeleton className="h-80" /><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {[...analysis.routes].sort((a, b) => a.id.localeCompare(b.id)).map((r) => (
                <RouteCard key={r.id} r={r} units={units} selected={r.id === sel?.id} onSelect={() => selectRoute(incident.id, r.id)} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-7 space-y-4">
              <OpsMap
                className="h-[440px]"
                incidents={relevant}
                ambulances={mapAmbs}
                hospitals={mapHsp}
                routes={analysis.routes}
                selectedRouteId={sel?.id}
                onSelectRoute={(r) => selectRoute(incident.id, r)}
                selectedIncidentId={incident.id}
                signalIncidentId={incident.id}
                compactToolbar
              />
              <Panel title="Selected Route Corridor" icon={<TrafficCone className="h-4 w-4" />} subtitle="Traffic segments and signalised intersections within the simulated route buffer" actions={<Link to={`/traffic?incident=${incident.id}`} className="text-xs text-cyan hover:underline">Signal priority →</Link>}>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line">
                  <div className="p-4">
                    <div className="label mb-2">Segments ({sel?.segmentIds.length ?? 0})</div>
                    {sel && sel.segmentIds.length === 0 && <p className="text-xs text-mute">Local roads only — no mapped demo segments on this route.</p>}
                    <ul className="space-y-1.5">
                      {sel?.segmentIds.map((sid) => {
                        const s = SEGMENTS_BY_ID[sid];
                        const v = s.congestion[usedSlice];
                        return (
                          <li key={sid} className="flex items-center justify-between gap-2 text-[12.5px]">
                            <span className="truncate">{s.name}</span>
                            <Badge tone={v === null ? 'mute' : v >= 0.8 ? 'red' : v >= 0.6 ? 'amber' : v >= 0.35 ? 'blue' : 'green'}>{congestionLevel(v)} · {pct(v)}</Badge>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="p-4">
                    <div className="label mb-2">Mapped intersections ({sel?.intersectionIds.length ?? 0}) + ~{sel ? sel.signalCount - sel.intersectionIds.length : 0} unmapped signals</div>
                    {sel && sel.intersectionIds.length === 0 && <p className="text-xs text-mute">No mapped demo intersections on this route.</p>}
                    <ul className="space-y-1.5">
                      {sel?.intersectionIds.map((xid) => {
                        const req = signalRequests.filter((r) => r.incidentId === incident.id && r.intersectionId === xid).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
                        return (
                          <li key={xid} className="flex items-center justify-between gap-2 text-[12.5px]">
                            <span className="truncate">{INTERSECTIONS_BY_ID[xid].name}</span>
                            <SignalBadge s={req?.status ?? 'Not Requested'} short />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </Panel>
            </div>
            <div className="xl:col-span-5 space-y-4">
              <Panel title="Why this route?" icon={<CheckCircle2 className="h-4 w-4" />} actions={<SimTag />}>
                <div className="p-4 space-y-3">
                  <Explanation {...analysis.explanation} />
                  {sel && sel.id !== analysis.best.id && (
                    <p className="text-xs text-amber flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />Operator override: Route {sel.id} is selected although Route {analysis.best.id} ranks first.</p>
                  )}
                </div>
              </Panel>
              <Panel title="Weighted score breakdown" icon={<BarChart3 className="h-4 w-4" />} subtitle="Stacked contribution of each criterion — shortest bar wins">
                <div className="p-3"><ScoreBreakdownChart routes={analysis.routes} /></div>
              </Panel>
              <Panel title="Estimated travel time & delay range" icon={<BarChart3 className="h-4 w-4" />} subtitle="Simulated values — not current real-world conditions">
                <div className="p-3"><EtaRangeChart routes={analysis.routes} /></div>
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Panel className="xl:col-span-8" title="Scoring model" icon={<Sigma className="h-4 w-4" />} actions={<Tooltip content="Deterministic: the same inputs always produce the same ranking. No AI model is used." />}>
              <div className="p-4 grid md:grid-cols-2 gap-4 text-[12.5px] text-mute leading-relaxed">
                <div className="space-y-2">
                  <pre className="font-mono text-[11.5px] text-ink bg-bg/60 border border-line rounded-md p-3 overflow-x-auto">{`score = w_time × norm(travelTime)
      + w_cong × norm(congestion)
      + w_sig  × norm(signalDelay)
      + w_risk × norm(roadRisk)
norm(x) = (x − min) / max(max − min, 0.25 × max)
lower score = better`}</pre>
                  <p>The best candidate on each criterion scores 0. The 25% floor keeps trivial differences from looking decisive. <b className="text-ink">Missing data</b> is never treated as zero risk: a missing input is normalised to 1.0 (worst) and lowers the route's input-completeness indicator.</p>
                </div>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>Route geometry is <b className="text-ink">simulated</b> (grid-snapped curves between origin and destination), not real road navigation.</li>
                  <li>Congestion = mean of seeded segment congestion within 0.7 km of the route for the selected simulated time slice.</li>
                  <li>Signals = mapped demo intersections within 0.5 km plus an estimate of unmapped signals by distance; simulated priority approvals reduce signal delay.</li>
                  <li>Travel time = distance ÷ demo free-flow speed × congestion factor + signal delay.</li>
                  <li>Scores support the dispatcher; they do not determine clinical triage or replace dispatch expertise.</li>
                </ul>
              </div>
            </Panel>
            <WeightsPanel className="xl:col-span-4" />
          </div>
          <Disclaimer>All routes, travel times and traffic conditions on this page are simulated demonstration values and must not be presented as current real-world conditions.</Disclaimer>
        </>
      )}
    </div>
  );
}
