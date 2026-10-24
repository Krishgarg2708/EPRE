import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Download } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, EmptyState } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Form';
import { PriorityBadge, IncidentStatusBadge } from '../components/ui/Badges';
import { useApp } from '../context/store';
import { useMaps } from '../hooks/useEntities';
import { useEtas } from '../hooks/useRoutes';
import { useNow } from '../hooks/useNow';
import { EMERGENCY_TYPES, INCIDENT_STATUSES, PRIORITIES, PRIORITY_RANK, OPEN_STATUSES } from '../data/constants';
import { fmtDateTime, fmtMinutes, timeAgo } from '../utils/format';
import { downloadCsv, SANDBOXED } from '../utils/csv';
import { cn } from '../utils/cn';
import type { Incident } from '../types';

type SortKey = 'time' | 'priority' | 'eta';
const PAGE = 10;

export default function Incidents() {
  const incidents = useApp((s) => s.incidents);
  const setCreateOpen = useApp((s) => s.setCreateOpen);
  const { ambById, hspById } = useMaps();
  const navigate = useNavigate();
  const now = useNow(30000);
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('open');
  const [sort, setSort] = useState<SortKey>('priority');
  const [dir, setDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const etas = useEtas(incidents);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = incidents.filter((i) => {
      if (priority && i.priority !== priority) return false;
      if (type && i.type !== type) return false;
      if (status === 'open' && !OPEN_STATUSES.includes(i.status)) return false;
      if (status === 'closed' && OPEN_STATUSES.includes(i.status)) return false;
      if (status && !['open', 'closed', 'all'].includes(status) && i.status !== status) return false;
      if (s && ![i.id, i.location, i.type, i.ambulanceId ?? '', i.area].some((v) => v.toLowerCase().includes(s))) return false;
      return true;
    });
    const cmp: Record<SortKey, (a: Incident, b: Incident) => number> = {
      time: (a, b) => b.createdAt.localeCompare(a.createdAt),
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt),
      eta: (a, b) => (etas[a.id] ?? Infinity) - (etas[b.id] ?? Infinity),
    };
    return r.sort((a, b) => cmp[sort](a, b) * dir);
  }, [incidents, q, priority, type, status, sort, dir, etas]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const visible = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const sortBy = (k: SortKey) => { if (sort === k) setDir((d) => (d === 1 ? -1 : 1)); else { setSort(k); setDir(1); } };
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };

  const SortTh = ({ k, children, className }: { k: SortKey; children: string; className?: string }) => (
    <th className={className} aria-sort={sort === k ? (dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => sortBy(k)} className={cn('inline-flex items-center gap-1 uppercase tracking-[0.08em]', sort === k && 'text-cyan')}>{children}<ArrowUpDown className="h-3 w-3" aria-hidden /></button>
    </th>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Emergency Incidents"
        subtitle="Create, review, assign and track simulated incidents through the dispatch workflow."
        actions={
          <>
            <Button icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadCsv('epre-incidents-demo.csv', rows.map((i) => ({ id: i.id, created: i.createdAt, priority: i.priority, type: i.type, status: i.status, location: i.location, area: i.area, ambulance: i.ambulanceId ?? '', hospital: i.hospitalId ?? '', simulated_eta_min: etas[i.id]?.toFixed(1) ?? '' })))} disabled={rows.length === 0}>{SANDBOXED ? 'Copy CSV' : 'Export CSV'}</Button>
            <Button variant="danger" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>New Incident</Button>
          </>
        }
      />
      <Panel>
        <div className="p-3 flex flex-wrap gap-2 border-b border-line">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" aria-hidden />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="input pl-9" placeholder="Search ID, location, unit, area…" aria-label="Search incidents" />
          </div>
          <Select className="w-auto" value={priority} onChange={(e) => resetPage(setPriority)(e.target.value)} aria-label="Filter by priority"><option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select>
          <Select className="w-auto" value={type} onChange={(e) => resetPage(setType)(e.target.value)} aria-label="Filter by type"><option value="">All types</option>{EMERGENCY_TYPES.map((p) => <option key={p}>{p}</option>)}</Select>
          <Select className="w-auto" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label="Filter by status">
            <option value="open">Open incidents</option><option value="closed">Closed (completed/cancelled)</option><option value="all">All statuses</option>
            <optgroup label="Specific status">{INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</optgroup>
          </Select>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={<Inbox className="h-8 w-8" />} title="No incidents found" body="No records match the current search and filters." action={<Button size="sm" onClick={() => { setQ(''); setPriority(''); setType(''); setStatus('all'); }}>Clear filters</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto scroll-thin hidden md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>ID</th><SortTh k="priority">Priority</SortTh><th>Type</th><th>Location</th><th>Unit</th><th>Destination</th><th>Status</th><SortTh k="eta" className="text-right">Sim. ETA</SortTh><SortTh k="time" className="text-right">Created</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr key={i.id} className="clickable" tabIndex={0} onClick={() => navigate(`/incidents/${i.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/incidents/${i.id}`)}>
                      <td className="font-mono text-xs">{i.id}</td>
                      <td><PriorityBadge p={i.priority} /></td>
                      <td>{i.type}</td>
                      <td className="max-w-[240px] truncate" title={i.location}>{i.location}<div className="text-[11px] text-mute">{i.area}</div></td>
                      <td className="font-mono text-xs">{i.ambulanceId ? `${i.ambulanceId}` : <span className="font-sans text-amber">Unassigned</span>}<div className="text-[11px] text-mute font-sans">{i.ambulanceId ? ambById[i.ambulanceId]?.callSign : ''}</div></td>
                      <td className="max-w-[180px] truncate">{i.hospitalId ? hspById[i.hospitalId]?.name.replace(' (Demo)', '') : <span className="text-mute">—</span>}</td>
                      <td><IncidentStatusBadge s={i.status} /></td>
                      <td className="text-right tabular-nums">{fmtMinutes(etas[i.id])}</td>
                      <td className="text-right whitespace-nowrap"><div>{timeAgo(i.createdAt, now)}</div><div className="text-[11px] text-mute">{fmtDateTime(i.createdAt)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-line">
              {visible.map((i) => (
                <li key={i.id}>
                  <button className="w-full text-left px-4 py-3" onClick={() => navigate(`/incidents/${i.id}`)}>
                    <div className="flex justify-between"><span className="font-mono text-xs">{i.id}</span><span className="text-[11px] text-mute">{timeAgo(i.createdAt, now)}</span></div>
                    <div className="flex gap-1.5 mt-1"><PriorityBadge p={i.priority} /><IncidentStatusBadge s={i.status} /></div>
                    <div className="text-[13px] mt-1">{i.type} · {i.location}</div>
                    <div className="text-[11px] text-mute">{i.ambulanceId ?? 'Unassigned'} · ETA {fmtMinutes(etas[i.id])}</div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-line text-xs text-mute">
          <span>{rows.length} records · page {cur + 1} of {pages}</span>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page">Prev</Button>
            <Button size="xs" variant="ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page">Next<ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
