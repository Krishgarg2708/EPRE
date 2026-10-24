import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Tooltip } from './Tooltip';
import type { Tone } from './Badges';

const toneText: Record<Tone, string> = { red: 'text-red', amber: 'text-amber', green: 'text-green', blue: 'text-blue', cyan: 'text-cyan', mute: 'text-mute' };
const toneBar: Record<Tone, string> = { red: 'bg-red', amber: 'bg-amber', green: 'bg-green', blue: 'bg-blue', cyan: 'bg-cyan', mute: 'bg-mute' };

export function MetricCard({ label, value, unit, icon, tone = 'cyan', sub, tip, index = 0, onClick, alert }: {
  label: string; value: ReactNode; unit?: string; icon: ReactNode; tone?: Tone; sub?: ReactNode; tip?: string; index?: number; onClick?: () => void; alert?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn('panel relative overflow-visible text-left px-4 py-3.5 min-w-0', onClick && 'hover:border-mute/50 transition-colors', alert && 'border-red/50 shadow-[0_0_0_1px_rgb(var(--red)/0.25),0_0_24px_-6px_rgb(var(--red)/0.5)]')}
    >
      {onClick && <button onClick={onClick} className="absolute inset-0 z-0 rounded-lg" aria-label={`Open ${label}`} />}
      <span className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-r', toneBar[tone])} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span className="label flex items-center gap-1.5 relative z-10 min-w-0">{label}{tip && <Tooltip content={tip} />}</span>
        <span className={cn('shrink-0', toneText[tone])} aria-hidden>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[26px] font-semibold leading-none tabular-nums">{value}</span>
        {unit && <span className="text-xs text-mute">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-mute truncate">{sub}</div>}
    </motion.div>
  );
}
