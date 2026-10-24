import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScoredRoute } from '../../types';

export const CHART = {
  grid: 'rgb(var(--line) / 0.6)',
  axis: 'rgb(var(--mute))',
  tooltip: {
    contentStyle: { background: 'rgb(var(--card))', border: '1px solid rgb(var(--line))', borderRadius: 6, fontSize: 12, color: 'rgb(var(--ink))' },
    labelStyle: { color: 'rgb(var(--ink))', fontWeight: 600 },
    itemStyle: { color: 'rgb(var(--ink))' },
    cursor: { fill: 'rgb(var(--line) / 0.25)' },
  },
  series: ['#35D5F2', '#5C9DFF', '#FFBF4A', '#FF4D5A', '#36D399', '#B48CFF', '#9AAABD', '#FF8A4A'],
};

/** Stacked weighted-score components per route: shows exactly why one ranks first (lower is better). */
export function ScoreBreakdownChart({ routes }: { routes: ScoredRoute[] }) {
  const data = [...routes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => ({
      name: `Route ${r.id}${r.rank === 1 ? ' ★' : ''}`,
      'Travel time': +r.components.time.toFixed(3),
      Congestion: +r.components.congestion.toFixed(3),
      'Signal delay': +r.components.signal.toFixed(3),
      'Road risk': +r.components.risk.toFixed(3),
    }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barSize={18}>
        <CartesianGrid stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" stroke={CHART.axis} fontSize={11} tickLine={false} domain={[0, 'auto']} />
        <YAxis type="category" dataKey="name" stroke={CHART.axis} fontSize={11} tickLine={false} width={74} />
        <Tooltip {...CHART.tooltip} formatter={(v: number) => v.toFixed(3)} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        <Bar dataKey="Travel time" stackId="s" fill="#35D5F2" />
        <Bar dataKey="Congestion" stackId="s" fill="#FFBF4A" />
        <Bar dataKey="Signal delay" stackId="s" fill="#5C9DFF" />
        <Bar dataKey="Road risk" stackId="s" fill="#FF4D5A" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Travel-time comparison with simulated delay range. */
export function EtaRangeChart({ routes }: { routes: ScoredRoute[] }) {
  const data = [...routes].sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    name: `Route ${r.id}`,
    'Best case (sim.)': +r.delayRange[0].toFixed(1),
    'Possible extra delay': +(r.delayRange[1] - r.delayRange[0]).toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 4, bottom: 4 }} barSize={28}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="name" stroke={CHART.axis} fontSize={11} tickLine={false} />
        <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} unit="m" />
        <Tooltip {...CHART.tooltip} formatter={(v: number) => `${v} min`} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        <Bar dataKey="Best case (sim.)" stackId="t" fill="#5C9DFF" />
        <Bar dataKey="Possible extra delay" stackId="t" fill="#FFBF4A" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
