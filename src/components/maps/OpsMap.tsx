import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip as LTooltip, CircleMarker, useMap } from 'react-leaflet';
import L, { type LatLngBoundsExpression } from 'leaflet';
import { Crosshair, Layers, Maximize2, Minimize2, Search, Expand, MapPinOff } from 'lucide-react';
import type { Ambulance, Hospital, Incident, LatLng, LayerKey, RouteId, ScoredRoute, SignalRequest } from '../../types';
import { useApp, TRAFFIC, INTERSECTION_LIST } from '../../context/store';
import { TILE_PROVIDERS } from '../../data/mapConfig';
import { REGION_VIEWS } from '../../data/constants';
import { ambulanceIcon, hospitalIcon, incidentIcon, signalIcon, CONGESTION_COLOR, COLORS } from './markers';
import { cn } from '../../utils/cn';
import { fmtCoords, fmtMinutes, pct } from '../../utils/format';
import { SimTag } from '../ui/Sim';
import { MapLegend } from './MapLegend';

export interface OpsMapProps {
  incidents: Incident[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  routes?: ScoredRoute[];
  selectedRouteId?: RouteId;
  onSelectRoute?: (id: RouteId) => void;
  hospitalLeg?: { from: LatLng; to: LatLng; label: string } | null;
  selectedIncidentId?: string | null;
  selectedAmbulanceId?: string | null;
  selectedHospitalId?: string | null;
  onSelectIncident?: (id: string) => void;
  onSelectAmbulance?: (id: string) => void;
  onSelectHospital?: (id: string) => void;
  signalIncidentId?: string | null;
  className?: string;
  /** Optional overlay rendered top-left inside the map frame. */
  overlay?: ReactNode;
  compactToolbar?: boolean;
  legendOpen?: boolean;
  /** Fly to the selected incident/routes when selection changes (default true). */
  autoFit?: boolean;
  /** Layers forced on/off for this view regardless of user preference. */
  forceLayers?: Partial<Record<LayerKey, boolean>>;
  focus?: { coords: LatLng; key: number } | null;
}

function MapRef({ onReady }: { onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

function Resizer({ dep }: { dep: unknown }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [dep, map]);
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

const LAYER_LABEL: Record<LayerKey, string> = { incidents: 'Incidents', ambulances: 'Ambulances', hospitals: 'Hospitals', routes: 'Routes', traffic: 'Traffic', signals: 'Signals' };

export function OpsMap(props: OpsMapProps) {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const slice = useApp((s) => s.trafficSlice);
  const signalRequests = useApp((s) => s.signalRequests);
  const [map, setMap] = useState<L.Map | null>(null);
  const [full, setFull] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tileErrors, setTileErrors] = useState(0);
  const [tileOk, setTileOk] = useState(false);
  const layers = { ...settings.layers, ...(props.forceLayers ?? {}) };
  const provider = TILE_PROVIDERS[settings.mapStyle];
  const region = REGION_VIEWS[settings.defaultRegion];
  const popupRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layersOpen) return;
    const down = (e: MouseEvent) => !toolbarRef.current?.contains(e.target as Node) && setLayersOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setLayersOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [layersOpen]);

  const setLayer = (k: LayerKey, v: boolean) => updateSettings({ layers: { ...settings.layers, [k]: v } });

  const allPoints = useMemo<LatLng[]>(
    () => [
      ...(layers.incidents ? props.incidents.map((i) => i.coords) : []),
      ...(layers.ambulances ? props.ambulances.map((a) => a.coords) : []),
    ],
    [props.incidents, props.ambulances, layers.incidents, layers.ambulances],
  );

  const fitAll = () => {
    if (!map) return;
    const pts = allPoints.length ? allPoints : props.hospitals.map((h) => h.coords);
    if (pts.length) map.fitBounds(L.latLngBounds(pts) as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
  };

  const zoomSelected = () => {
    if (!map) return;
    const inc = props.incidents.find((i) => i.id === props.selectedIncidentId);
    const amb = props.ambulances.find((a) => a.id === props.selectedAmbulanceId);
    const target = amb?.coords ?? inc?.coords;
    if (target) map.flyTo(target, 14, { duration: 0.6 });
  };

  // Fly to selected route bounds / incident when selection changes
  useEffect(() => {
    if (!map || props.autoFit === false) return;
    if (props.routes && props.routes.length && layers.routes) {
      const pts = props.routes.flatMap((r) => r.path);
      map.flyToBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 14, duration: 0.6 });
    } else {
      const inc = props.incidents.find((i) => i.id === props.selectedIncidentId);
      if (inc) map.flyTo(inc.coords, Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, props.selectedIncidentId, props.routes?.[0]?.path[0]?.[0], props.routes?.[0]?.path[0]?.[1]]);

  useEffect(() => {
    if (map && props.focus) map.flyTo(props.focus.coords, 15, { duration: 0.6 });
  }, [map, props.focus]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full]);

  const searchResults = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const r: { id: string; label: string; sub: string; coords: LatLng; kind: 'incident' | 'ambulance' | 'hospital' }[] = [];
    props.incidents.forEach((i) => (i.id.toLowerCase().includes(s) || i.location.toLowerCase().includes(s)) && r.push({ id: i.id, label: i.id, sub: i.location, coords: i.coords, kind: 'incident' }));
    props.ambulances.forEach((a) => (a.id.toLowerCase().includes(s) || a.callSign.toLowerCase().includes(s) || a.base.toLowerCase().includes(s)) && r.push({ id: a.id, label: `${a.id} · ${a.callSign}`, sub: a.base, coords: a.coords, kind: 'ambulance' }));
    props.hospitals.forEach((h) => (h.name.toLowerCase().includes(s) || h.area.toLowerCase().includes(s)) && r.push({ id: h.id, label: h.name, sub: h.area, coords: h.coords, kind: 'hospital' }));
    return r.slice(0, 7);
  }, [q, props.incidents, props.ambulances, props.hospitals]);

  const signalByIntersection = useMemo(() => {
    const m: Record<string, SignalRequest> = {};
    for (const r of signalRequests) {
      if (props.signalIncidentId && r.incidentId !== props.signalIncidentId) continue;
      if (!m[r.intersectionId] || m[r.intersectionId].requestedAt < r.requestedAt) m[r.intersectionId] = r;
    }
    return m;
  }, [signalRequests, props.signalIncidentId]);

  const tilesFailed = tileErrors > 6 && !tileOk;
  const sortedRoutes = props.routes ? [...props.routes].sort((a, b) => (a.id === props.selectedRouteId ? 1 : b.id === props.selectedRouteId ? -1 : 0)) : [];

  return (
    <div className={cn('overflow-hidden bg-bg', full ? 'fixed inset-0 z-[800]' : cn('relative', props.className?.includes('border-0') ? '' : 'rounded-lg border border-line', props.className))} ref={popupRef}>
      <div className={cn('absolute inset-0', tilesFailed && 'map-fallback-grid')}>
        <MapContainer center={region.center} zoom={region.zoom} zoomControl={false} className="h-full w-full" attributionControl preferCanvas={false}>
          <MapRef onReady={setMap} />
          <Resizer dep={full} />
          <TileLayer
            key={provider.id}
            url={provider.url}
            attribution={provider.attribution}
            maxZoom={provider.maxZoom}
            eventHandlers={{ tileerror: () => setTileErrors((n) => n + 1), tileload: () => setTileOk(true) }}
          />

          {layers.traffic &&
            TRAFFIC.map((s) => (
              <Polyline key={s.id} positions={s.path} pathOptions={{ color: CONGESTION_COLOR(s.congestion[slice]), weight: 6, opacity: 0.55, lineCap: 'round' }}>
                <LTooltip sticky>
                  <b>{s.name}</b>
                  <br />Simulated congestion: {pct(s.congestion[slice])} · Road: {s.roadCondition}
                </LTooltip>
              </Polyline>
            ))}

          {layers.routes && props.hospitalLeg && (
            <Polyline positions={[props.hospitalLeg.from, props.hospitalLeg.to]} pathOptions={{ color: COLORS.blue, weight: 2, dashArray: '2 8', opacity: 0.8 }}>
              <LTooltip sticky>{props.hospitalLeg.label} — straight-line estimate, not a road route</LTooltip>
            </Polyline>
          )}

          {layers.routes &&
            sortedRoutes.map((r) => {
              const sel = r.id === props.selectedRouteId;
              return (
                <Polyline
                  key={`${r.id}-${sel}`}
                  positions={r.path}
                  eventHandlers={{ click: () => props.onSelectRoute?.(r.id) }}
                  pathOptions={sel ? { color: COLORS.cyan, weight: 5, opacity: 0.95 } : { color: r.rank === 1 ? COLORS.green : '#7c8ba0', weight: 3, opacity: 0.6, dashArray: '6 8' }}
                >
                  <LTooltip sticky>
                    <b>Route {r.id} — {r.strategy}</b> {r.rank === 1 ? '(recommended)' : ''}
                    <br />{fmtMinutes(r.travelMin)} · {r.distanceKm.toFixed(1)} km · simulated road geometry
                  </LTooltip>
                </Polyline>
              );
            })}

          {layers.signals &&
            INTERSECTION_LIST.map((x) => {
              const req = signalByIntersection[x.id];
              const status = req?.status ?? 'Not Requested';
              return (
                <Marker key={x.id} position={x.coords} icon={signalIcon(status)} zIndexOffset={-200}>
                  <LTooltip>
                    <b>{x.name}</b>
                    <br />Signal priority: {status}
                  </LTooltip>
                </Marker>
              );
            })}

          {layers.hospitals &&
            props.hospitals.map((h) => (
              <Marker key={h.id} position={h.coords} icon={hospitalIcon(h, h.id === props.selectedHospitalId)} eventHandlers={{ click: () => props.onSelectHospital?.(h.id) }}>
                <Popup>
                  <div className="space-y-1 min-w-[200px]">
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-mute">{h.area}</div>
                    <div>ED status: <b>{h.edStatus}</b></div>
                    <div>Beds (simulated): {h.bedsAvailable ?? 'Unknown'} / {h.bedsTotal}</div>
                    <div className="text-mute">{h.capabilities.join(' · ')}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {layers.ambulances &&
            props.ambulances.map((a) => (
              <Marker key={a.id} position={a.coords} icon={ambulanceIcon(a, a.id === props.selectedAmbulanceId)} zIndexOffset={400} eventHandlers={{ click: () => props.onSelectAmbulance?.(a.id) }}>
                <Popup>
                  <div className="space-y-1 min-w-[190px]">
                    <div className="font-semibold">{a.id} · {a.callSign}</div>
                    <div>{a.type} · {a.status}</div>
                    <div>Incident: {a.incidentId ?? '—'}</div>
                    <div className="text-mute font-mono text-[11px]">{fmtCoords(a.coords)} (simulated)</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {layers.incidents &&
            props.incidents.map((i) => (
              <Marker key={i.id} position={i.coords} icon={incidentIcon(i, i.id === props.selectedIncidentId)} zIndexOffset={i.id === props.selectedIncidentId ? 1000 : 600} eventHandlers={{ click: () => props.onSelectIncident?.(i.id) }}>
                <LTooltip direction="top" offset={[0, -12]}>
                  {i.id} · {i.priority} · {i.type}
                </LTooltip>
              </Marker>
            ))}

          {props.selectedIncidentId && layers.incidents && (() => {
            const inc = props.incidents.find((i) => i.id === props.selectedIncidentId);
            return inc ? <CircleMarker center={inc.coords} radius={22} pathOptions={{ color: COLORS.cyan, weight: 1.5, fillOpacity: 0.06, dashArray: '3 4' }} interactive={false} /> : null;
          })()}
        </MapContainer>
      </div>


      {/* Top-left overlay slot */}
      {props.overlay && <div className="absolute left-3 top-14 sm:top-3 z-[500] max-w-[calc(100%-1.5rem)]">{props.overlay}</div>}

      {/* Toolbar */}
      <div ref={toolbarRef} className="absolute right-3 top-3 z-[600] flex flex-col items-end gap-2 no-print">
        <div className="flex items-center gap-1 panel bg-surface/95 backdrop-blur p-1 shadow-lg">
          {!props.compactToolbar && (
            <div className="relative">
              <div className="flex items-center gap-1.5 px-2 h-7 rounded bg-bg/60 border border-line">
                <Search className="h-3.5 w-3.5 text-mute" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find on map…" aria-label="Search map locations" className="bg-transparent text-xs w-28 sm:w-40 outline-none placeholder:text-mute/70" />
              </div>
              {searchResults.length > 0 && (
                <ul className="absolute right-0 mt-1 w-72 panel bg-card shadow-xl py-1 max-h-72 overflow-auto scroll-thin" role="listbox">
                  {searchResults.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-surface"
                        onClick={() => {
                          map?.flyTo(r.coords, 15, { duration: 0.6 });
                          if (r.kind === 'incident') props.onSelectIncident?.(r.id);
                          if (r.kind === 'ambulance') props.onSelectAmbulance?.(r.id);
                          if (r.kind === 'hospital') props.onSelectHospital?.(r.id);
                          setQ('');
                        }}
                      >
                        <div className="text-xs font-medium">{r.label}</div>
                        <div className="text-[11px] text-mute capitalize">{r.kind} · {r.sub}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <ToolBtn label="Map layers" onClick={() => setLayersOpen((v) => !v)} active={layersOpen}><Layers className="h-4 w-4" /></ToolBtn>
          <ToolBtn label="Fit all active incidents and units" onClick={fitAll}><Expand className="h-4 w-4" /></ToolBtn>
          <ToolBtn label="Zoom to selection" onClick={zoomSelected} disabled={!props.selectedIncidentId && !props.selectedAmbulanceId}><Crosshair className="h-4 w-4" /></ToolBtn>
          <ToolBtn label={full ? 'Exit full screen' : 'Full screen map'} onClick={() => setFull((v) => !v)}>{full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</ToolBtn>
        </div>
        {layersOpen && (
          <div className="panel bg-surface/95 backdrop-blur p-3 w-56 shadow-xl space-y-2" role="group" aria-label="Map layers">
            <div className="label">Layers</div>
            {(Object.keys(LAYER_LABEL) as LayerKey[]).map((k) => (
              <label key={k} className="flex items-center justify-between text-xs cursor-pointer">
                {LAYER_LABEL[k]}
                <input type="checkbox" checked={layers[k]} disabled={props.forceLayers?.[k] !== undefined} onChange={(e) => setLayer(k, e.target.checked)} className="accent-[rgb(var(--cyan))] h-3.5 w-3.5 disabled:opacity-50" />
              </label>
            ))}
            <div className="label pt-2">Base map</div>
            {(Object.values(TILE_PROVIDERS)).map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="mapstyle" checked={settings.mapStyle === p.id} onChange={() => updateSettings({ mapStyle: p.id })} className="accent-[rgb(var(--cyan))]" />
                {p.label}
              </label>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1 panel bg-surface/95 p-1 shadow-lg">
          <ToolBtn label="Zoom in" onClick={() => map?.zoomIn()}>+</ToolBtn>
          <ToolBtn label="Zoom out" onClick={() => map?.zoomOut()}>−</ToolBtn>
        </div>
      </div>

      <div className="absolute left-3 bottom-3 z-[500] flex flex-col gap-2 items-start no-print">
        <MapLegend showRoutes={!!props.routes?.length} showTraffic={layers.traffic} showSignals={layers.signals} defaultOpen={props.legendOpen} />
      </div>
      <div className="absolute right-3 bottom-7 z-[500] no-print flex flex-col items-end gap-1.5">
        {tilesFailed && (
          <div className="panel bg-card px-2 py-1 text-[11px] flex items-center gap-1.5 text-amber" role="status" title="Map tiles could not load. Overlays are shown on a grid fallback.">
            <MapPinOff className="h-3.5 w-3.5" aria-hidden />Base map offline · grid fallback
          </div>
        )}
        <SimTag>DEMO LOCATIONS · SIMULATED</SimTag>
      </div>
    </div>
  );
}

function ToolBtn({ label, onClick, children, active, disabled }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={active}
      className={cn('h-7 w-7 grid place-items-center rounded text-mute hover:text-ink hover:bg-card text-base leading-none disabled:opacity-40', active && 'bg-card text-cyan')}>
      {children}
    </button>
  );
}
