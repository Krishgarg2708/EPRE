import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { ScoredRoute } from '../../types';
import { cn } from '../../utils/cn';
import { fmtMinutes, pct } from '../../utils/format';
import { Badge } from '../ui/Badges';

export function ConfidenceBar({ v }: { v: number }) {
  const tone = v >= 0.75 ? 'bg-green' : v >= 0.55 ? 'bg-amber' : 'bg-red';
  const label = v >= 0.75 ? 'Good' : v >= 0.55 ? 'Partial' : 'Low';
  return (
    <div className="flex items-center gap-2" aria-label={`Input data completeness ${Math.round(v * 100)} percent (${label})`}>
      <div className="h-1.5 w-16 rounded-full bg-card overflow-hidden"><div className={cn('h-full rounded-full', tone)} style={{ width: `${v * 100}%` }} /></div>
      <span className="text-[11px] text-mute">{label} ({Math.round(v * 100)}%)</span>
    </div>
  );
}

/** Compact list row for a candidate route. */
export function RouteRow({ r, selected, onSelect }: { r: ScoredRoute; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn('w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors', selected ? 'border-cyan bg-cyan/[0.06]' : 'border-line hover:bg-card')}
    >
      <span className={cn('h-7 w-7 shrink-0 rounded grid place-items-center font-semibold text-sm', r.rank === 1 ? 'bg-green/15 text-green' : 'bg-card text-mute')}>{r.id}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12.5px]">
          <span className="truncate">{r.strategy}</span>
          {r.rank === 1 && <Badge tone="green" icon={<CheckCircle2 className="h-3 w-3" />}>Recommended</Badge>}
        </div>
        <div className="text-[11px] text-mute truncate">via {r.via} · congestion {pct(r.congestion)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[13px] tabular-nums font-medium">{fmtMinutes(r.travelMin)}</div>
        <div className="text-[10.5px] text-mute tabular-nums">score {r.score.toFixed(2)}</div>
      </div>
    </button>
  );
}

export function DelayFactors({ r }: { r: ScoredRoute }) {
  const items: { label: string; value: string; warn?: boolean }[] = [
    { label: 'Congestion exposure', value: pct(r.congestion), warn: r.congestion === null || r.congestion >= 0.7 },
    { label: 'Signals on route', value: `${r.signalCount}${r.signalsCleared ? ` (${r.signalsCleared} sim. cleared)` : ''} · ~${r.signalDelayMin.toFixed(1)} min`, warn: r.signalDelayMin > 3 },
    { label: 'Road-condition risk', value: r.roadRisk === null ? 'No data' : pct(r.roadRisk), warn: r.roadRisk === null || r.roadRisk >= 0.5 },
    { label: 'Delay range (sim.)', value: `${fmtMinutes(r.delayRange[0])} – ${fmtMinutes(r.delayRange[1])}` },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-md bg-bg/50 border border-line px-2.5 py-2">
          <div className="text-[10.5px] text-mute flex items-center gap-1">{i.warn && <AlertTriangle className="h-3 w-3 text-amber" aria-label="Attention" />}{i.label}</div>
          <div className="text-[12.5px] mt-0.5 tabular-nums">{i.value}</div>
        </div>
      ))}
      {r.missing.length > 0 && (
        <div className="col-span-2 flex items-start gap-1.5 text-[11px] text-amber"><Info className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />Missing inputs scored conservatively: {r.missing.join('; ')}.</div>
      )}
    </div>
  );
}

export function Explanation({ headline, reasons, tradeoffs }: { headline: string; reasons: string[]; tradeoffs: string[] }) {
  return (
    <div className="rounded-md border border-green/30 bg-green/[0.05] px-3 py-2.5 text-[12.5px] space-y-1.5">
      <p className="font-medium">{headline}</p>
      <ul className="space-y-1 text-mute">
        {reasons.map((r) => <li key={r} className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 mt-px text-green shrink-0" aria-hidden />{r}</li>)}
        {tradeoffs.map((r) => <li key={r} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 mt-px text-amber shrink-0" aria-hidden />{r}</li>)}
      </ul>
    </div>
  );
}
