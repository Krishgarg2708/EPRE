import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListOrdered, ChevronRight, Inbox } from 'lucide-react';
import { Panel, EmptyState } from '../ui/Panel';
import { PriorityBadge, IncidentStatusBadge } from '../ui/Badges';
import { Segmented } from '../ui/Form';
import { useApp } from '../../context/store';
import { useOpenIncidents, useMaps } from '../../hooks/useEntities';
import { useEtas } from '../../hooks/useRoutes';
import { PRIORITY_RANK } from '../../data/constants';
import { fmtMinutes, timeAgo } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useNow } from '../../hooks/useNow';

export function IncidentQueue({ className }: { className?: string }) {
  const open = useOpenIncidents();
  const { ambById, hspById } = useMaps();
  const selectedId = useApp((s) => s.selectedIncidentId);
  const select = useApp((s) => s.selectIncident);
  const navigate = useNavigate();
  const now = useNow(30000);
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'critical'>('all');
  const etas = useEtas(open);

  const rows = useMemo(() => {
    const r = open.filter((i) => (filter === 'unassigned' ? !i.ambulanceId : filter === 'critical' ? i.priority === 'Critical' : true));
    return r.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt));
  }, [open, filter]);

  return (
    <Panel
      title="Active Incident Queue"
      icon={<ListOrdered className="h-4 w-4" />}
      subtitle="Sorted by priority, then age · click a row to select it on the map"
      className={className}
      actions={<Segmented label="Queue filter" size="xs" value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${open.length}` }, { value: 'unassigned', label: 'Unassigned' }, { value: 'critical', label: 'Critical' }]} />}
      bodyClass="overflow-auto scroll-thin"
    >
      {rows.length === 0 ? (
        <EmptyState icon={<Inbox className="h-8 w-8" />} title="No incidents match" body="Try another filter or create a new incident." />
      ) : (
        <>
          {/* Desktop table */}
          <table className="table-base hidden md:table">
            <thead>
              <tr>
                <th>ID</th><th>Priority</th><th>Type</th><th>Pickup location</th><th>Unit</th><th>Destination</th><th>Status</th><th className="text-right">Sim. ETA</th><th className="text-right">Age</th><th><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr
                  key={i.id}
                  className={cn('clickable', i.id === selectedId && 'bg-cyan/[0.07] shadow-[inset_3px_0_0_rgb(var(--cyan))]')}
                  onClick={() => select(i.id)}
                  onKeyDown={(e) => e.key === 'Enter' && select(i.id)}
                  tabIndex={0}
                  aria-selected={i.id === selectedId}
                >
                  <td className="font-mono text-xs">{i.id}</td>
                  <td><PriorityBadge p={i.priority} /></td>
                  <td className="whitespace-nowrap">{i.type}</td>
                  <td className="max-w-[200px] truncate" title={i.location}>{i.location}</td>
                  <td className="font-mono text-xs">{i.ambulanceId ? <span title={ambById[i.ambulanceId]?.callSign}>{i.ambulanceId}</span> : <span className="text-amber font-sans">Unassigned</span>}</td>
                  <td className="max-w-[160px] truncate" title={hspById[i.hospitalId ?? '']?.name}>{i.hospitalId ? hspById[i.hospitalId]?.name.replace(' (Demo)', '') : <span className="text-mute">—</span>}</td>
                  <td><IncidentStatusBadge s={i.status} /></td>
                  <td className="text-right tabular-nums">{fmtMinutes(etas[i.id])}</td>
                  <td className="text-right text-mute whitespace-nowrap">{timeAgo(i.createdAt, now)}</td>
                  <td>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${i.id}`); }} className="h-7 w-7 grid place-items-center rounded text-mute hover:text-ink hover:bg-card" aria-label={`Open ${i.id} details`}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-line">
            {rows.map((i) => (
              <li key={i.id}>
                <button onClick={() => { select(i.id); navigate(`/incidents/${i.id}`); }} className={cn('w-full text-left px-4 py-3', i.id === selectedId && 'bg-cyan/[0.07]')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{i.id}</span>
                    <span className="text-[11px] text-mute">{timeAgo(i.createdAt, now)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5"><PriorityBadge p={i.priority} /><IncidentStatusBadge s={i.status} /></div>
                  <div className="text-[13px] mt-1">{i.type} · {i.location}</div>
                  <div className="text-[11px] text-mute mt-0.5">{i.ambulanceId ?? 'Unassigned'} · ETA {fmtMinutes(etas[i.id])}</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
