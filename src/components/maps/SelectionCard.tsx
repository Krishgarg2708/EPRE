import { Link } from 'react-router-dom';
import { X, MapPin, Ambulance as AmbIcon } from 'lucide-react';
import type { Ambulance, Incident } from '../../types';
import { PriorityBadge, IncidentStatusBadge, AmbulanceStatusBadge } from '../ui/Badges';
import { fmtCoords, fmtMinutes, timeAgo } from '../../utils/format';

export function IncidentCard({ inc, eta, onClose }: { inc: Incident; eta?: number; onClose?: () => void }) {
  return (
    <div className="panel bg-surface/95 backdrop-blur shadow-xl p-3 w-[min(300px,calc(100vw-5rem))] text-[12px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-cyan" aria-hidden /><span className="font-mono text-[12px]">{inc.id}</span></div>
        {onClose && <button onClick={onClose} aria-label="Clear selection" className="text-mute hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1"><PriorityBadge p={inc.priority} /><IncidentStatusBadge s={inc.status} /></div>
      <div className="mt-1.5 font-medium">{inc.type} · {inc.location}</div>
      <div className="text-mute mt-0.5">{inc.ambulanceId ?? 'No unit assigned'} · Sim. ETA {fmtMinutes(eta)} · {timeAgo(inc.createdAt)}</div>
      <div className="mt-2 flex gap-3">
        <Link to={`/incidents/${inc.id}`} className="text-cyan hover:underline">Details</Link>
        <Link to={`/routes?incident=${inc.id}`} className="text-cyan hover:underline">Routes</Link>
      </div>
    </div>
  );
}

export function AmbulanceCard({ amb, eta, onClose }: { amb: Ambulance; eta?: number; onClose?: () => void }) {
  return (
    <div className="panel bg-surface/95 backdrop-blur shadow-xl p-3 w-[min(300px,calc(100vw-5rem))] text-[12px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5"><AmbIcon className="h-3.5 w-3.5 text-cyan" aria-hidden /><span className="font-mono">{amb.id}</span><span className="text-mute">· {amb.callSign} · {amb.type}</span></div>
        {onClose && <button onClick={onClose} aria-label="Clear ambulance selection" className="text-mute hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
      </div>
      <div className="mt-1.5"><AmbulanceStatusBadge s={amb.status} /></div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-mute">Location</dt><dd className="font-mono text-[11px]">{fmtCoords(amb.coords)} <span className="text-amber">(sim.)</span></dd>
        <dt className="text-mute">Incident</dt><dd>{amb.incidentId ? <Link className="text-cyan hover:underline" to={`/incidents/${amb.incidentId}`}>{amb.incidentId}</Link> : '—'}</dd>
        <dt className="text-mute">Sim. ETA</dt><dd>{fmtMinutes(eta)}</dd>
        <dt className="text-mute">Updated</dt><dd>{timeAgo(amb.lastUpdate)}</dd>
      </dl>
      <Link to={`/fleet?id=${amb.id}`} className="mt-2 inline-block text-cyan hover:underline">Open in fleet</Link>
    </div>
  );
}
