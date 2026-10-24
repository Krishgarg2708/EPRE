import { Check } from 'lucide-react';
import type { IncidentStatus } from '../../types';
import { cn } from '../../utils/cn';

const STEPS: { label: string; statuses: IncidentStatus[] }[] = [
  { label: 'Created', statuses: ['New'] },
  { label: 'Review', statuses: ['Awaiting Assignment'] },
  { label: 'Assigned', statuses: ['Assigned'] },
  { label: 'Dispatched', statuses: ['Dispatched', 'En Route'] },
  { label: 'At pickup', statuses: ['At Pickup'] },
  { label: 'Transport', statuses: ['Transporting'] },
  { label: 'At hospital', statuses: ['Arrived at Hospital'] },
  { label: 'Completed', statuses: ['Completed'] },
];

export function WorkflowStepper({ status }: { status: IncidentStatus }) {
  const current = STEPS.findIndex((s) => s.statuses.includes(status));
  const cancelled = status === 'Cancelled';
  return (
    <ol className="flex items-center gap-0 overflow-x-auto scroll-thin pb-1" aria-label="Incident workflow">
      {STEPS.map((s, i) => {
        const done = !cancelled && i < current;
        const active = !cancelled && i === current;
        return (
          <li key={s.label} className="flex items-center min-w-0" aria-current={active ? 'step' : undefined}>
            <div className="flex flex-col items-center gap-1 px-1 min-w-[68px]">
              <span className={cn('h-6 w-6 rounded-full grid place-items-center text-[10px] font-semibold border', done ? 'bg-green/20 border-green text-green' : active ? 'bg-cyan/20 border-cyan text-cyan shadow-[0_0_12px_rgb(var(--cyan)/0.4)]' : 'border-line text-mute')}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('text-[10.5px] whitespace-nowrap', active ? 'text-ink font-medium' : 'text-mute')}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={cn('h-px w-6 shrink-0 -mt-4', done ? 'bg-green' : 'bg-line')} aria-hidden />}
          </li>
        );
      })}
      {cancelled && <li className="ml-3 text-xs text-mute">Cancelled</li>}
    </ol>
  );
}
