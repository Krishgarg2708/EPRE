import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Filter, Crosshair, X, Hospital as HIcon, Ambulance as AIcon, MapPin } from 'lucide-react';
import { OpsMap } from '../components/maps/OpsMap';
import { PriorityBadge, IncidentStatusBadge, AmbulanceStatusBadge, AvailabilityBadge, Badge } from '../components/ui/Badges';
import { KV, EmptyState } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { SimTag } from '../components/ui/Sim';
import { useApp } from '../context/store';
import { useRoutes, useEtas } from '../hooks/useRoutes';
import { OPEN_STATUSES, PRIORITIES, PRIORITY_RANK } from '../data/constants';
import type { Availability, LatLng, Priority } from '../types';
import { cn } from '../utils/cn';
import { fmtCoords, fmtMinutes, timeAgo, fmtDistance } from '../utils/format';
import { straightLineEstimate } from '../utils/geo';

type AmbFilter = 'all' | 'available' | 'busy' | 'offline';
type IncFilter = 'open' | 'unassigned' | 'moving';

export default function LiveMap() {
  const incidents = useApp((s) => s.incidents);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const units = useApp((s) => s.settings.units);
  const selectedId = useApp((s) => s.selectedIncidentId);
  const selectedAmbId = useApp((s) => s.selectedAmbulanceId);
  const selectIncident = useApp((s) => s.selectIncident);
  const selectAmbulance = useApp((s) => s.selectAmbulance);
  const selectRoute = useApp((s) => s.selectRoute);
  const [listOpen, setListOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priorities, setPriorities] = useState<Priority[]>([...PRIORITIES]);
  const [incFilter, setIncFilter] = useState<IncFilter>('open');
  const [ambFilter, setAmbFilter] = useState<AmbFilter>('all');
  const [hspFilter, setHspFilter] = useState<Availability | 'all'>('all');
  const [hspSel, setHspSel] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ coords: LatLng; key: number } | null>(null);
  const [q, setQ] = useState('');

  const zoom = (coords: LatLng) => setFocus({ coords, key: Date.now() });

  const visibleIncidents = useMemo(() => {
    const s = q.trim().toLowerCase();
    return incidents
      .filter((i) => OPEN_STATUSES.includes(i.status))
      .filter((i) => priorities.includes(i.priority))
      .filter((i) => (incFilter === 'unassigned' ? !i.ambulanceId : incFilter === 'moving' ? ['Dispatched', 'En Route', 'Transporting'].includes(i.status) : true))
      .filter((i) => !s || i.id.toLowerCase().includes(s) || i.location.toLowerCase().includes(s) || (i.ambulanceId ?? '').toLowerCase().includes(s))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt));
  }, [incidents, priorities, incFilter, q]);

  const visibleAmbs = useMemo(
    () => ambulances.filter((a) => (ambFilter === 'available' ? a.status === 'Available' : ambFilter === 'busy' ? !['Available', 'Offline', 'Maintenance'].includes(a.status) : ambFilter === 'offline' ? ['Offline', 'Maintenance'].includes(a.status) : true)),
    [ambulances, ambFilter],
  );
  const visibleHsp = useMemo(() => hospitals.filter((h) => hspFilter === 'all' || h.edStatus === hspFilter), [hospitals, hspFilter]);

  const incident = incidents.find((i) => i.id === selectedId);
  const analysis = useRoutes(incident && OPEN_STATUSES.includes(incident.status) ? incident : undefined);
  const amb = ambulances.find((a) => a.id === selectedAmbId);
  const hsp = hospitals.find((h) => h.id === hspSel);
  const etas = useEtas(visibleIncidents);
  const incHsp = hospitals.find((h) => h.id === incident?.hospitalId);

  const togglePriority = (p: Priority) => setPriorities((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const activeFilterCount = (priorities.length < 4 ? 1 : 0) + (incFilter !== 'open' ? 1 : 0) + (ambFilter !== 'all' ? 1 : 0) + (hspFilter !== 'all' ? 1 : 0);

  const details = amb ? 'amb' : hsp ? 'hsp' : incident ? 'inc' : null;

  return (
    <div className="h-full flex relative">
      {/* Left list */}
      <aside className={cn('shrink-0 border-r border-line bg-surface flex flex-col transition-[width] duration-200 overflow-hidden', listOpen ? 'w-[300px] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-[600] max-md:w-[86vw] max-md:shadow-2xl' : 'w-0 border-r-0')} aria-label="Incident list">
        <div className="p-3 border-b border-line space-y-2 min-w-[300px] max-md:min-w-0">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold">Live Operations Map</h1>
            <button onClick={() => setListOpen(false)} className="text-mute hover:text-ink" aria-label="Collapse incident list"><PanelLeftClose className="h-4 w-4" /></button>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input h-8 text-xs" placeholder="Search incident ID, vehicle ID, location…" aria-label="Search incidents" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-mute">{visibleIncidents.length} incidents shown</span>
            <button onClick={() => setFiltersOpen((v) => !v)} className={cn('flex items-center gap-1 text-[11px] rounded px-2 h-6 border', filtersOpen || activeFilterCount ? 'border-cyan text-cyan' : 'border-line text-mute')} aria-expanded={filtersOpen}>
              <Filter className="h-3 w-3" aria-hidden />Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
          {filtersOpen && (
            <div className="space-y-2.5 pt-1 text-[11px]">
              <div>
                <div className="label mb-1">Incident priority</div>
                <div className="flex flex-wrap gap-1">
                  {PRIORITIES.map((p) => (
                    <button key={p} onClick={() => togglePriority(p)} aria-pressed={priorities.includes(p)} className={cn('px-2 h-6 rounded border', priorities.includes(p) ? 'border-cyan/60 bg-cyan/10 text-ink' : 'border-line text-mute line-through')}>{p}</button>
                  ))}
                </div>
              </div>
              <label className="block"><span className="label">Incident status</span>
                <select value={incFilter} onChange={(e) => setIncFilter(e.target.value as IncFilter)} className="input h-7 text-xs mt-1">
                  <option value="open">All open</option><option value="unassigned">Unassigned only</option><option value="moving">Units moving</option>
                </select>
              </label>
              <label className="block"><span className="label">Ambulances</span>
                <select value={ambFilter} onChange={(e) => setAmbFilter(e.target.value as AmbFilter)} className="input h-7 text-xs mt-1">
                  <option value="all">All units</option><option value="available">Available</option><option value="busy">On assignment</option><option value="offline">Offline / maintenance</option>
                </select>
              </label>
              <label className="block"><span className="label">Hospitals</span>
                <select value={hspFilter} onChange={(e) => setHspFilter(e.target.value as Availability | 'all')} className="input h-7 text-xs mt-1">
                  <option value="all">All hospitals</option><option>Available</option><option>Limited Capacity</option><option>Unavailable</option><option>Unknown</option>
                </select>
              </label>
              {activeFilterCount > 0 && <button className="text-cyan hover:underline" onClick={() => { setPriorities([...PRIORITIES]); setIncFilter('open'); setAmbFilter('all'); setHspFilter('all'); }}>Clear filters</button>}
            </div>
          )}
        </div>
        <ul className="flex-1 overflow-y-auto scroll-thin min-w-[300px] max-md:min-w-0">
          {visibleIncidents.length === 0 && <li><EmptyState title="No incidents match" body="Adjust the filters or search." /></li>}
          {visibleIncidents.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => { selectIncident(i.id); setHspSel(null); if (window.innerWidth < 768) setListOpen(false); }}
                className={cn('w-full text-left px-3 py-2.5 border-b border-line/60 hover:bg-card', i.id === selectedId && 'bg-cyan/[0.07] shadow-[inset_3px_0_0_rgb(var(--cyan))]')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11.5px]">{i.id}</span>
                  <span className="text-[10.5px] text-mute">{timeAgo(i.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1"><PriorityBadge p={i.priority} /><IncidentStatusBadge s={i.status} /></div>
                <div className="text-[12px] mt-1 truncate">{i.type} · {i.location}</div>
                <div className="text-[10.5px] text-mute">{i.ambulanceId ?? 'Unassigned'} · ETA {fmtMinutes(etas[i.id])}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1 min-w-0 relative">
        <div className="absolute inset-0">
        <OpsMap
          className="h-full rounded-none border-0"
          incidents={visibleIncidents}
          ambulances={visibleAmbs}
          hospitals={visibleHsp}
          routes={analysis?.routes}
          selectedRouteId={analysis?.selected.id}
          onSelectRoute={(r) => incident && selectRoute(incident.id, r)}
          hospitalLeg={incident && incHsp && analysis?.leg === 'pickup' ? { from: incident.coords, to: incHsp.coords, label: `${incident.id} → ${incHsp.name}` } : null}
          selectedIncidentId={selectedId}
          selectedAmbulanceId={selectedAmbId}
          selectedHospitalId={hspSel}
          onSelectIncident={(id) => { selectIncident(id); setHspSel(null); }}
          onSelectAmbulance={(id) => { selectAmbulance(id); setHspSel(null); }}
          onSelectHospital={(id) => { setHspSel(id); selectAmbulance(null); }}
          signalIncidentId={selectedId}
          focus={focus}
          legendOpen
          overlay={!listOpen ? (
            <button onClick={() => setListOpen(true)} className="panel bg-surface/95 h-8 px-2.5 flex items-center gap-1.5 text-xs shadow-lg" aria-label="Show incident list">
              <PanelLeftOpen className="h-4 w-4" />Incidents ({visibleIncidents.length})
            </button>
          ) : undefined}
        />
        </div>

        {/* Right details panel */}
        {details && (
          <aside className="absolute z-[550] right-3 top-[136px] bottom-12 w-[min(320px,calc(100%-1.5rem))] panel bg-surface/95 backdrop-blur shadow-2xl flex flex-col max-md:top-auto max-md:bottom-3 max-md:max-h-[55%]" aria-label="Selection details">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h2 className="text-[13px] font-semibold flex items-center gap-2">
                {details === 'amb' ? <AIcon className="h-4 w-4 text-cyan" /> : details === 'hsp' ? <HIcon className="h-4 w-4 text-cyan" /> : <MapPin className="h-4 w-4 text-cyan" />}
                {details === 'amb' ? amb?.id : details === 'hsp' ? 'Hospital' : incident?.id}
              </h2>
              <div className="flex items-center gap-1">
                <SimTag />
                <button onClick={() => { if (details === 'amb') selectAmbulance(null); else if (details === 'hsp') setHspSel(null); else selectIncident(null); }} className="text-mute hover:text-ink ml-1" aria-label="Close details"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3 text-[12.5px]">
              {details === 'inc' && incident && (
                <>
                  <div className="flex flex-wrap gap-1"><PriorityBadge p={incident.priority} /><IncidentStatusBadge s={incident.status} /><Badge>{incident.type}</Badge></div>
                  <p>{incident.location}</p>
                  <p className="text-mute">{incident.conditionSummary}</p>
                  <div>
                    <KV k="Unit" v={incident.ambulanceId ?? <span className="text-amber">Unassigned</span>} />
                    <KV k="Destination" v={incHsp?.name ?? '—'} />
                    <KV k="Sim. ETA" v={fmtMinutes(etas[incident.id])} />
                    {analysis && <KV k={`Route ${analysis.selected.id}`} v={`${fmtMinutes(analysis.selected.travelMin)} · ${fmtDistance(analysis.selected.distanceKm, units)}`} />}
                    <KV k="Coordinates" v={fmtCoords(incident.coords)} mono />
                  </div>
                  {analysis && <p className="text-[11.5px] text-mute border-l-2 border-green pl-2">{analysis.explanation.headline}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" icon={<Crosshair className="h-3 w-3" />} onClick={() => zoom(incident.coords)}>Zoom to incident</Button>
                    {incident.ambulanceId && <Button size="xs" icon={<Crosshair className="h-3 w-3" />} onClick={() => { const a = ambulances.find((x) => x.id === incident.ambulanceId); if (a) zoom(a.coords); }}>Zoom to unit</Button>}
                    <Link to={`/incidents/${incident.id}`} className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-line hover:bg-card">Open incident</Link>
                    <Link to={`/routes?incident=${incident.id}`} className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-line hover:bg-card">Compare routes</Link>
                  </div>
                </>
              )}
              {details === 'amb' && amb && (
                <>
                  <div className="flex items-center gap-2"><AmbulanceStatusBadge s={amb.status} /><Badge tone="cyan">{amb.type}</Badge><span className="text-mute">{amb.callSign}</span></div>
                  <div>
                    <KV k="Base" v={amb.base} />
                    <KV k="Location (sim.)" v={fmtCoords(amb.coords)} mono />
                    <KV k="Assigned incident" v={amb.incidentId ? <Link className="text-cyan hover:underline" to={`/incidents/${amb.incidentId}`}>{amb.incidentId}</Link> : '—'} />
                    <KV k="Sim. ETA" v={amb.incidentId ? fmtMinutes(etas[amb.incidentId]) : '—'} />
                    <KV k="Fuel (demo)" v={`${amb.fuelPct}%`} />
                    <KV k="Last update" v={timeAgo(amb.lastUpdate)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" icon={<Crosshair className="h-3 w-3" />} onClick={() => zoom(amb.coords)}>Zoom to ambulance</Button>
                    <Link to={`/fleet?id=${amb.id}`} className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-line hover:bg-card">Fleet details</Link>
                  </div>
                </>
              )}
              {details === 'hsp' && hsp && (
                <>
                  <p className="font-medium">{hsp.name}</p>
                  <AvailabilityBadge s={hsp.edStatus} />
                  <div>
                    <KV k="Area" v={hsp.area} />
                    <KV k="Beds (sim.)" v={`${hsp.bedsAvailable ?? 'Unknown'} / ${hsp.bedsTotal}`} />
                    <KV k="ICU (sim.)" v={hsp.icuAvailable ?? 'Unknown'} />
                    {incident && <KV k={`From ${incident.id}`} v={`~${Math.round(straightLineEstimate(incident.coords, hsp.coords).minutes)} min (straight-line est.)`} />}
                    <KV k="Updated" v={timeAgo(hsp.lastUpdate)} />
                  </div>
                  <div className="flex flex-wrap gap-1">{hsp.capabilities.map((c) => <Badge key={c}>{c}</Badge>)}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" icon={<Crosshair className="h-3 w-3" />} onClick={() => zoom(hsp.coords)}>Zoom to hospital</Button>
                    <Link to={`/hospitals?id=${hsp.id}`} className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-line hover:bg-card">Hospital details</Link>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
