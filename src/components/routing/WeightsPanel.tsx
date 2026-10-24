import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useApp } from '../../context/store';
import { DEFAULT_WEIGHTS } from '../../data/constants';
import type { RouteWeights } from '../../types';

const LABELS: Record<keyof RouteWeights, string> = { time: 'Travel time', congestion: 'Congestion exposure', signal: 'Signal delay', risk: 'Road-condition risk' };

export function WeightsPanel({ className }: { className?: string }) {
  const weights = useApp((s) => s.settings.weights);
  const update = useApp((s) => s.updateSettings);
  const total = weights.time + weights.congestion + weights.signal + weights.risk;
  const set = (k: keyof RouteWeights, v: number) => update({ weights: { ...weights, [k]: v } });
  return (
    <Panel
      title="Scoring Weights"
      icon={<SlidersHorizontal className="h-4 w-4" />}
      className={className}
      actions={<Button size="xs" variant="ghost" icon={<RotateCcw className="h-3 w-3" />} onClick={() => update({ weights: DEFAULT_WEIGHTS })}>Defaults</Button>}
    >
      <div className="p-4 space-y-3">
        {(Object.keys(LABELS) as (keyof RouteWeights)[]).map((k) => (
          <div key={k}>
            <div className="flex justify-between text-[12px]">
              <label htmlFor={`w-${k}`}>{LABELS[k]}</label>
              <span className="tabular-nums text-mute">{weights[k].toFixed(2)} <span className="text-[10px]">({total ? Math.round((weights[k] / total) * 100) : 0}%)</span></span>
            </div>
            <input id={`w-${k}`} type="range" min={0} max={1} step={0.05} value={weights[k]} onChange={(e) => set(k, Number(e.target.value))} className="w-full accent-[rgb(var(--cyan))]" />
          </div>
        ))}
        <p className="text-[11px] text-mute leading-relaxed">
          Weights are normalised to sum to 1. These are <b className="text-ink">demonstration defaults</b>, not medically validated or operationally approved rules. Changes apply immediately and persist in this browser.
        </p>
      </div>
    </Panel>
  );
}
