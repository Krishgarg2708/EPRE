import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, AlertOctagon, X } from 'lucide-react';
import { useToasts } from '../../context/toasts';
import { cn } from '../../utils/cn';

const ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertOctagon };
const TONE = { info: 'text-blue', success: 'text-green', warning: 'text-amber', danger: 'text-red' };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-[1100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] no-print" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const I = ICON[t.tone];
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.16 }}
              className="panel bg-card shadow-2xl px-3.5 py-3 flex gap-3 items-start">
              <I className={cn('h-4 w-4 mt-0.5 shrink-0', TONE[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{t.title}</p>
                {t.body && <p className="text-xs text-mute mt-0.5">{t.body}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-mute hover:text-ink" aria-label="Dismiss notification"><X className="h-3.5 w-3.5" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
