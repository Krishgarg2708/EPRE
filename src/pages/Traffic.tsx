import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TrafficCone, Radio, History, Clock3, ShieldOff, Signpost } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, EmptyState, KV } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { Segmented, Select } from '../components/ui/Form';
import { Badge, SignalBadge, PriorityBadge } from '../components/ui/Badges';
import { SimTag } from '../components/ui/Sim';
import { OpsMap } from '../components/maps/OpsMap';
import { useApp, TRAFFIC, INTERSECTION_LIST, INTERSECTIONS_BY_ID, SEGMENTS_BY_ID } from '../context/store';
import { toast } from '../context/toasts';
import { useRoutes, useAnalysisCtx } from '../hooks/useRoutes';
import { useOpenIncidents } from '../hooks/useEntities';
import { analyzeIncident } from '../utils/analysis';
import { TRAFFIC_SLICES, congestionLevel } from '../data/constants';
import { fmtDateTime, fmtTime, pct } from '../utils/format';
import type { Intersection, SignalRequestStatus, TrafficSliceId } from '../types';
import { cn } from '../utils/cn';

const levelTone = (v: number | null) => (v === null ? 'mute' : v >= 0.8 ? 'red' : v >= 0.6 ? 'amber' : v >= 0.35 ? 'blue' : 'green') as 'mute' | 'red' | 'amber' | 'blue' | 'green';

function DemoBanner() {
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-amber/50 bg-amber/[0.08] px-4 py-3" role="alert">
      <ShieldOff className="h-5 w-5 text-amber shrink-0" aria-hidden />
      <p className="text-sm font-semibold text-amber tracking-wide">DEMO ONLY — No traffic signals are connected or controlled.</p>
    </div>
  );
}

export default function Traffic() {
  const [params, setParams] = useSearchParams();
  const slice = useApp((s) => s.trafficSlice);
  const setSlice = useApp((s) => s.setTrafficSlice);
  const incidents = useApp((s) => s.incidents);
  const ambulances = useApp((s) => s.ambulances);
  const requests = useApp((s) => s.signalRequests);
  const requestSignal = useApp((s) => s.requestSignal);
  const open = useOpenIncidents();
  const withUnits = open.filter((i) => i.ambulanceId);
  const ctx = useAnalysisCtx();
  // Default to an incident whose selected route actually crosses mapped demo intersections
  const fallbackId = useMemo(() => withUnits.find((i) => (analyzeIncident(i, ctx)?.selected.intersectionIds.length ?? 0) > 0)?.id ?? withUnits[0]?.id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withUnits.map((i) => i.id).join(), ctx]);
  const incId = params.get('incident') ?? fallbackId ?? '';
  const incident = incidents.find((i) => i.id === incId);
  const analysis = useRoutes(incident);
  const amb = ambulances.find((a) => a.id === incident?.ambulanceId);
  const [confirmX, setConfirmX] = useState<Intersection | null>(null);
  const [detailX, setDetailX] = useState<string | null>(null);
  const [histFilter, setHistFilter] = useState<SignalRequestStatus | ''>('');
  const highlightSeg = params.get('segment');

  // Route impact: how many active incidents' selected routes pass each segment
  const impact = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const i of open) {
      if (!i.ambulanceId) continue;
      const a = analyzeIncident(i, ctx);
      a?.selected.segmentIds.forEach((s) => (m[s] = [...(m[s] ?? []), i.id]));
    }
    return m;
  }, [open, ctx]);

  const latestFor = (xid: string) => requests.filter((r) => r.incidentId === incident?.id && r.intersectionId === xid).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
  const routeX = (analysis?.selected.intersectionIds ?? []).map((id) => INTERSECTIONS_BY_ID[id]);
  const history = requests.filter((r) => !histFilter || r.status === histFilter).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const timeline = requests
    .filter((r) => r.incidentId === incident?.id)
    .flatMap((r) => [
      { at: r.requestedAt, text: `Simulated request sent — ${INTERSECTIONS_BY_ID[r.intersectionId]?.name} (Route ${r.routeId})`, status: 'Simulated Request Pending' as SignalRequestStatus },
      ...(r.resolvedAt ? [{ at: r.resolvedAt, text: `${r.status.replace('Simulated Request ', 'Simulated ')} — ${INTERSECTIONS_BY_ID[r.intersectionId]?.name}`, status: r.status }] : []),
    ])
    .sort((a, b) => b.at.localeCompare(a.at));
  const detail = detailX ? INTERSECTIONS_BY_ID[detailX] : null;

  const doRequest = () => {
    if (!confirmX || !incident || !analysis) return;
    const r = requestSignal(incident.id, analysis.selected.id, confirmX.id);
    if (!r.ok) toast('Request not created', r.error, 'danger');
    else toast('Simulated request pending', `${confirmX.name} — result in a few seconds (demo rule).`, 'info');
    setConfirmX(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Traffic & Signal Priority"
        subtitle="Simulated congestion analysis and emergency signal-priority coordination workflow."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-mute hidden sm:inline">Simulated traffic snapshot</span>
            <Segmented<TrafficSliceId> label="Simulated traffic snapshot" value={slice} onChange={(v) => { setSlice(v); toast('Traffic snapshot changed', 'Existing route recommendations are now marked stale until recalculated.', 'warning'); }} options={TRAFFIC_SLICES.map((s) => ({ value: s.id, label: s.label }))} />
          </div>
        }
      />
      <DemoBanner />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 space-y-4">
          <OpsMap
            className="h-[420px]"
            incidents={incident ? [incident] : []}
            ambulances={amb ? [amb] : []}
            hospitals={[]}
            routes={analysis ? analysis.routes.filter((r) => r.id === analysis.selected.id) : undefined}
            selectedRouteId={analysis?.selected.id}
            selectedIncidentId={incident?.id}
            signalIncidentId={incident?.id}
            forceLayers={{ traffic: true, signals: true }}
            autoFit={false}
            compactToolbar
          />
          <Panel title="Traffic segments" icon={<TrafficCone className="h-4 w-4" />} subtitle={`${TRAFFIC_SLICES.find((s) => s.id === slice)?.label} (${TRAFFIC_SLICES.find((s) => s.id === slice)?.window}) · simulated`} actions={<SimTag />} bodyClass="overflow-x-auto scroll-thin">
            <table className="table-base">
              <thead><tr><th>Segment</th><th>Congestion</th><th className="text-right">Est. delay</th><th>Road</th><th>Route impact</th></tr></thead>
              <tbody>
                {TRAFFIC.map((s) => {
                  const v = s.congestion[slice];
                  const delay = v === null ? null : (s.lengthKm / 40) * 60 * 1.3 * v;
                  return (
                    <tr key={s.id} className={cn(highlightSeg === s.id && 'bg-cyan/[0.08]')}>
                      <td><div>{s.name}</div><div className="text-[11px] text-mute">{s.corridor} · {s.lengthKm} km</div></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-card overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v ?? 0) * 100}%`, background: `rgb(var(--${levelTone(v) === 'mute' ? 'mute' : levelTone(v)}))` }} /></div>
                          <Badge tone={levelTone(v)}>{congestionLevel(v)}{v !== null && ` · ${pct(v)}`}</Badge>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{delay === null ? <span className="text-mute">No data</span> : `+${delay.toFixed(1)} min`}</td>
                      <td><Badge tone={s.roadCondition === 'Good' ? 'green' : s.roadCondition === 'Fair' ? 'blue' : 'amber'}>{s.roadCondition}</Badge></td>
                      <td>{impact[s.id]?.length ? <span className="text-[12px]">{impact[s.id].map((id) => <Link key={id} to={`/incidents/${id}`} className="text-cyan hover:underline mr-1.5 font-mono text-[11px]">{id}</Link>)}</span> : <span className="text-mute text-[12px]">None</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <Panel title="Signal-priority coordination" icon={<Radio className="h-4 w-4" />} actions={<SimTag>DEMO ONLY</SimTag>}>
            <div className="p-4 space-y-3">
              <Select value={incId} onChange={(e) => setParams(e.target.value ? { incident: e.target.value } : {})} aria-label="Incident with assigned ambulance">
                {withUnits.length === 0 && <option value="">No incidents with assigned units</option>}
                {withUnits.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.ambulanceId} · {i.status}</option>)}
              </Select>
              {!incident || !analysis ? (
                <EmptyState icon={<Signpost className="h-7 w-7" />} title="No route selected" body="Assign an ambulance to an incident to coordinate simulated signal priority." />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <PriorityBadge p={incident.priority} />
                    <span>{amb?.id} · {amb?.callSign}</span>
                    <span className="text-mute">Route {analysis.selected.id} ({analysis.selected.strategy}) · {analysis.leg} leg</span>
                  </div>
                  {routeX.length === 0 ? (
                    <p className="text-xs text-mute">The selected route passes no mapped demo intersections. Try another route on the Route Intelligence page.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {routeX.map((x) => {
                        const req = latestFor(x.id);
                        const st = req?.status ?? 'Not Requested';
                        const active = st === 'Simulated Request Pending' || st === 'Simulated Request Approved';
                        return (
                          <li key={x.id} className={cn('flex items-center gap-2 rounded-md border px-3 py-2', detailX === x.id ? 'border-cyan' : 'border-line')}>
                            <button className="min-w-0 flex-1 text-left" onClick={() => setDetailX(x.id)}>
                              <div className="text-[12.5px] truncate">{x.name}</div>
                              <div className="mt-0.5"><SignalBadge s={st} /></div>
                            </button>
                            <Button size="xs" variant={active ? 'ghost' : 'primary'} disabled={active || ['Completed', 'Cancelled'].includes(incident.status)} onClick={() => setConfirmX(x)}>
                              {active ? 'Active' : 'Simulate Priority Request'}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="text-[11px] text-mute">Outcomes are produced by a fixed demo rule (intersection + snapshot). Approved requests reduce simulated signal delay on that route.</p>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Intersection details" icon={<Signpost className="h-4 w-4" />}>
            <div className="p-4">
              <Select value={detailX ?? ''} onChange={(e) => setDetailX(e.target.value || null)} aria-label="Choose intersection" className="mb-3">
                <option value="">Select an intersection…</option>
                {INTERSECTION_LIST.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
              {detail ? (
                <>
                  <KV k="Intersection ID" v={detail.id} mono />
                  <KV k="On segment" v={SEGMENTS_BY_ID[detail.segmentId]?.name} />
                  <KV k="Segment congestion (sim.)" v={pct(SEGMENTS_BY_ID[detail.segmentId]?.congestion[slice] ?? null)} />
                  <KV k="Coordinates" v={`${detail.coords[0].toFixed(4)}, ${detail.coords[1].toFixed(4)}`} mono />
                  <KV k="Simulated requests (all)" v={requests.filter((r) => r.intersectionId === detail.id).length} />
                  <KV k="Controller connection" v={<span className="text-amber">None — demo only</span>} />
                </>
              ) : <p className="text-xs text-mute">Choose an intersection to see its details.</p>}
            </div>
          </Panel>

          <Panel title="Coordination timeline" icon={<Clock3 className="h-4 w-4" />} subtitle={incident ? `For ${incident.id}` : undefined} bodyClass="max-h-[260px] overflow-y-auto scroll-thin">
            {timeline.length === 0 ? <EmptyState title="No simulated requests yet" /> : (
              <ol className="p-4 space-y-2.5">
                {timeline.map((t, i) => (
                  <li key={`${t.at}-${i}`} className="flex gap-3 text-[12px]">
                    <span className="font-mono text-[11px] text-mute w-11 shrink-0">{fmtTime(t.at)}</span>
                    <div className="min-w-0"><div>{t.text}</div><div className="mt-0.5"><SignalBadge s={t.status} short /></div></div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Request history" icon={<History className="h-4 w-4" />} actions={
        <Select className="h-7 w-auto text-xs" value={histFilter} onChange={(e) => setHistFilter(e.target.value as SignalRequestStatus | '')} aria-label="Filter history by status">
          <option value="">All statuses</option>
          {(['Simulated Request Pending', 'Simulated Request Approved', 'Simulated Request Rejected', 'Simulated Request Expired'] as SignalRequestStatus[]).map((s) => <option key={s}>{s}</option>)}
        </Select>
      } bodyClass="overflow-x-auto scroll-thin">
        {history.length === 0 ? <EmptyState title="No requests" /> : (
          <table className="table-base">
            <thead><tr><th>Request</th><th>Incident</th><th>Ambulance</th><th>Intersection</th><th>Route</th><th>Status</th><th>Requested</th><th>Resolved</th><th>Note</th></tr></thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[11px]">{r.id}</td>
                  <td><Link className="text-cyan hover:underline font-mono text-xs" to={`/incidents/${r.incidentId}`}>{r.incidentId}</Link></td>
                  <td className="font-mono text-xs">{r.ambulanceId}</td>
                  <td>{INTERSECTIONS_BY_ID[r.intersectionId]?.name}</td>
                  <td>{r.routeId}</td>
                  <td><SignalBadge s={r.status} short /></td>
                  <td className="whitespace-nowrap text-[12px]">{fmtDateTime(r.requestedAt)}</td>
                  <td className="whitespace-nowrap text-[12px]">{r.resolvedAt ? fmtDateTime(r.resolvedAt) : '—'}</td>
                  <td className="text-[11.5px] text-mute">{r.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <ConfirmDialog
        open={!!confirmX}
        title="Simulate signal-priority request?"
        confirmLabel="Send simulated request"
        onCancel={() => setConfirmX(null)}
        onConfirm={doRequest}
        body={<span className="font-semibold text-amber">DEMO ONLY — No traffic signals are connected or controlled.</span>}
      >
        {incident && analysis && confirmX && (
          <div className="rounded-md border border-line p-3 text-ink">
            <KV k="Ambulance" v={`${amb?.id} · ${amb?.callSign}`} />
            <KV k="Incident" v={incident.id} />
            <KV k="Route" v={`Route ${analysis.selected.id} — ${analysis.selected.strategy}`} />
            <KV k="Intersection" v={confirmX.name} />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
