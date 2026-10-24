import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Download, Printer, BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel, EmptyState } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Segmented, Select } from '../components/ui/Form';
import { Disclaimer, SimTag } from '../components/ui/Sim';
import { CHART } from '../components/routing/ScoreChart';
import { useApp } from '../context/store';
import { EMERGENCY_TYPES, PRIORITIES, INCIDENT_STATUSES } from '../data/constants';
import { downloadCsv, SANDBOXED } from '../utils/csv';
import type { Incident } from '../types';

type Range = '24h' | '7d' | '30d' | 'all';
type Metric = 'response' | 'count';
const RANGE_MS: Record<Range, number> = { '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000, all: Infinity };
const PRIORITY_COLOR: Record<string, string> = { Critical: '#FF4D5A', High: '#FFBF4A', Medium: '#5C9DFF', Low: '#9AAABD' };

function ChartPanel({ title, children, empty, subtitle, className }: { title: string; children: ReactNode; empty?: boolean; subtitle?: string; className?: string }) {
  return (
    <Panel title={title} subtitle={subtitle} className={className} actions={<SimTag />}>
      <div className="p-3 h-[260px]">{empty ? <EmptyState title="No data for this selection" body="Widen the date range or clear filters." /> : children}</div>
    </Panel>
  );
}

const ax = { stroke: CHART.axis, fontSize: 11, tickLine: false } as const;

export default function Analytics() {
  const incidents = useApp((s) => s.incidents);
  const archive = useApp((s) => s.archive);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const [range, setRange] = useState<Range>('7d');
  const [metric, setMetric] = useState<Metric>('response');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');

  const data = useMemo(() => {
    const now = Date.now();
    return [...incidents, ...archive].filter((i) => now - new Date(i.createdAt).getTime() <= RANGE_MS[range] && (!priority || i.priority === priority) && (!type || i.type === type));
  }, [incidents, archive, range, priority, type]);

  const charts = useMemo(() => {
    const count = <K extends string>(keys: readonly K[], f: (i: Incident) => K | undefined) => keys.map((k) => ({ name: k, value: data.filter((i) => f(i) === k).length }));
    const byPriority = count(PRIORITIES, (i) => i.priority);
    const byType = count(EMERGENCY_TYPES, (i) => i.type).sort((a, b) => b.value - a.value);
    const byStatus = count(INCIDENT_STATUSES, (i) => i.status).filter((d) => d.value > 0);
    const util = ambulances.map((a) => ({ name: a.id.replace('AMB-', ''), value: data.filter((i) => i.ambulanceId === a.id).length }));
    const routes = count(['A', 'B', 'C'] as const, (i) => i.routeUsed).map((d) => ({ ...d, name: `Route ${d.name}` }));
    const hosp = hospitals.map((h) => ({ name: h.name.replace(' (Demo)', '').replace('Hospital', 'Hosp.'), value: data.filter((i) => i.hospitalId === h.id).length })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
    const hours = Array.from({ length: 24 }, (_, h) => ({ name: String(h).padStart(2, '0'), value: data.filter((i) => new Date(i.createdAt).getHours() === h).length }));
    // Trend: by hour for 24h, by day otherwise
    const buckets = new Map<string, { key: string; label: string; n: number; resp: number[] }>();
    const byHour = range === '24h';
    for (const i of [...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const d = new Date(i.createdAt);
      const key = byHour ? `${d.toDateString()} ${d.getHours()}` : d.toDateString();
      const label = byHour ? `${String(d.getHours()).padStart(2, '0')}:00` : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const b = buckets.get(key) ?? { key, label, n: 0, resp: [] };
      b.n++;
      if (i.responseMin !== undefined) b.resp.push(i.responseMin);
      buckets.set(key, b);
    }
    const trend = [...buckets.values()].map((b) => ({ name: b.label, count: b.n, response: b.resp.length ? +(b.resp.reduce((x, y) => x + y, 0) / b.resp.length).toFixed(1) : null }));
    const resp = data.filter((i) => i.responseMin !== undefined).map((i) => i.responseMin as number);
    const avg = resp.length ? resp.reduce((a, b) => a + b, 0) / resp.length : null;
    const sorted = [...resp].sort((a, b) => a - b);
    const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : null;
    return { byPriority, byType, byStatus, util, routes, hosp, hours, trend, avg, p90, completed: data.filter((i) => i.status === 'Completed').length, cancelled: data.filter((i) => i.status === 'Cancelled').length };
  }, [data, ambulances, hospitals, range]);

  const empty = data.length === 0;

  const exportCsv = () =>
    downloadCsv(`epre-demo-records-${range}.csv`, data.map((i) => ({
      id: i.id, created_at: i.createdAt, priority: i.priority, type: i.type, status: i.status, area: i.area,
      ambulance: i.ambulanceId ?? '', hospital: i.hospitalId ?? '', simulated_response_min: i.responseMin ?? '', route_used: i.routeUsed ?? '',
      record_type: i.archived ? 'archived demo' : 'live demo',
    })));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics & Reports"
        subtitle="All charts derive from the same simulated dataset used across EPRE. Values are not measured real-world performance."
        actions={
          <>
            <Button icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv} disabled={empty}>{SANDBOXED ? 'Copy CSV' : 'Export CSV'} ({data.length})</Button>
            {!SANDBOXED && <Button icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>Print report</Button>}
          </>
        }
      />

      <div className="panel p-3 flex flex-wrap items-center gap-3 no-print">
        <Segmented<Range> label="Date range" value={range} onChange={setRange} options={[{ value: '24h', label: 'Last 24h' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'all', label: 'All' }]} />
        <Select className="w-auto h-8 text-xs" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority"><option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select>
        <Select className="w-auto h-8 text-xs" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by emergency type"><option value="">All types</option>{EMERGENCY_TYPES.map((p) => <option key={p}>{p}</option>)}</Select>
        <span className="ml-auto text-xs text-mute">{data.length} demo records in view</span>
      </div>

      <div className="hidden print:block text-sm">EPRE demo report · {new Date().toLocaleString('en-IN')} · range: {range}{priority && ` · ${priority}`}{type && ` · ${type}`} · SIMULATED DATA</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Records', v: data.length },
          { l: 'Avg sim. response', v: charts.avg === null ? '—' : `${charts.avg.toFixed(1)} min` },
          { l: '90th pct sim. response', v: charts.p90 === null ? '—' : `${charts.p90.toFixed(1)} min` },
          { l: 'Completed / cancelled', v: `${charts.completed} / ${charts.cancelled}` },
        ].map((k) => (
          <div key={k.l} className="panel px-4 py-3"><div className="label">{k.l}</div><div className="text-xl font-semibold mt-1 tabular-nums">{k.v}</div></div>
        ))}
      </div>

      <Panel
        title={metric === 'response' ? 'Simulated Response-Time Trend' : 'Incident Volume Trend'}
        subtitle={range === '24h' ? 'Hourly buckets' : 'Daily buckets'}
        actions={<><Segmented<Metric> size="xs" label="Trend metric" value={metric} onChange={setMetric} options={[{ value: 'response', label: 'Avg response' }, { value: 'count', label: 'Incident count' }]} /><SimTag className="ml-2" /></>}
      >
        <div className="p-3 h-[280px]">
          {empty ? <EmptyState title="No data for this selection" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.trend} margin={{ left: -8, right: 12, top: 8 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" {...ax} minTickGap={16} />
                <YAxis {...ax} unit={metric === 'response' ? 'm' : ''} allowDecimals={metric === 'response'} />
                <Tooltip {...CHART.tooltip} formatter={(v: number) => (metric === 'response' ? `${v} min (simulated)` : `${v} incidents`)} />
                <Line type="monotone" dataKey={metric} name={metric === 'response' ? 'Avg simulated response' : 'Incidents'} stroke="#35D5F2" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartPanel title="Incidents by priority" empty={empty}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.byPriority} margin={{ left: -16, top: 8 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" {...ax} /><YAxis {...ax} allowDecimals={false} />
              <Tooltip {...CHART.tooltip} />
              <Bar dataKey="value" name="Incidents" radius={[3, 3, 0, 0]}>{charts.byPriority.map((d) => <Cell key={d.name} fill={PRIORITY_COLOR[d.name]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Incidents by emergency type" empty={empty}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.byType} layout="vertical" margin={{ left: 10, right: 12 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...ax} allowDecimals={false} /><YAxis type="category" dataKey="name" {...ax} width={86} />
              <Tooltip {...CHART.tooltip} />
              <Bar dataKey="value" name="Incidents" fill="#5C9DFF" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Incident status distribution" empty={empty}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={charts.byStatus} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} stroke="rgb(var(--surface))">
                {charts.byStatus.map((d, i) => <Cell key={d.name} fill={d.name === 'Completed' ? '#36D399' : d.name === 'Cancelled' ? '#5b6878' : CHART.series[i % CHART.series.length]} />)}
              </Pie>
              <Tooltip {...CHART.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Ambulance utilisation" subtitle="Incidents handled per unit in range" empty={empty}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.util} margin={{ left: -16, top: 8 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" {...ax} /><YAxis {...ax} allowDecimals={false} />
              <Tooltip {...CHART.tooltip} labelFormatter={(l) => `AMB-${l}`} />
              <Bar dataKey="value" name="Incidents" fill="#35D5F2" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Route recommendation distribution" subtitle="Route used for pickup leg (simulated)" empty={empty || charts.routes.every((r) => r.value === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.routes} margin={{ left: -16, top: 8 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" {...ax} /><YAxis {...ax} allowDecimals={false} />
              <Tooltip {...CHART.tooltip} />
              <Bar dataKey="value" name="Incidents" radius={[3, 3, 0, 0]}>{charts.routes.map((d, i) => <Cell key={d.name} fill={['#35D5F2', '#36D399', '#FFBF4A'][i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Hospital destination distribution" subtitle="Top destinations in range" empty={empty || charts.hosp.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.hosp} layout="vertical" margin={{ left: 10, right: 12 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...ax} allowDecimals={false} /><YAxis type="category" dataKey="name" {...ax} width={140} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
              <Tooltip {...CHART.tooltip} />
              <Bar dataKey="value" name="Incidents" fill="#36D399" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <ChartPanel title="Incident volume by hour of day" empty={empty}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.hours} margin={{ left: -16, top: 8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" {...ax} interval={1} /><YAxis {...ax} allowDecimals={false} />
            <Tooltip {...CHART.tooltip} labelFormatter={(l) => `${l}:00–${l}:59`} />
            <Bar dataKey="value" name="Incidents" fill="#B48CFF" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <Disclaimer>
        <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" aria-hidden /></span> These analytics summarise seeded and operator-generated demo records only. They make no claims about real response times, lives saved or proven improvements.
      </Disclaimer>
    </div>
  );
}
